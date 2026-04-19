<script setup lang="ts">
import { ref, watch } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import { apiFetch } from '@/api/client';
import { NODE_COLORS, NODE_LABELS } from '@/types/graph';
import type { GraphEdge, GraphNode, NodeKind } from '@/types/graph';
import SourceSnippet from './SourceSnippet.vue';

const graphStore = useGraphStore();
const showSnippet = ref(false);
const snippetRef = ref<InstanceType<typeof SourceSnippet>>();

// Phase 9-9 — anti-pattern overlay loaded once per session and indexed
// by node id so opening NodeDetail is O(1).
const antiPatterns = ref<{ byNodeId: Record<string, string[]>; suggestions: Record<string, string> } | null>(null);
async function loadAntiPatterns(): Promise<void> {
  if (antiPatterns.value) return;
  try {
    const res = await apiFetch('/api/analysis/anti-patterns');
    if (res.ok) antiPatterns.value = await res.json();
  } catch {
    /* keep null */
  }
}
loadAntiPatterns();
function tagsForCurrentNode(): string[] {
  const id = graphStore.selectedNode?.id;
  if (!id || !antiPatterns.value) return [];
  return antiPatterns.value.byNodeId[id] ?? [];
}
function tagColor(tag: string): string {
  if (tag === 'god-object') return '#ef4444';
  if (tag === 'cyclic-cluster') return '#f59e0b';
  if (tag === 'utility-sink') return '#3498db';
  return '#22c55e';
}

// Phase 11-3 — relative time helper for "Last touched". Uses native
// Intl.RelativeTimeFormat — already in the cytoscape-bundle target.
function formatLastTouched(iso: string): string {
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return iso;
  const ms = Date.now() - then;
  const day = 86_400_000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (ms < day) return rtf.format(-Math.round(ms / 3_600_000), 'hour');
  if (ms < 30 * day) return rtf.format(-Math.round(ms / day), 'day');
  if (ms < 365 * day) return rtf.format(-Math.round(ms / (30 * day)), 'month');
  return rtf.format(-Math.round(ms / (365 * day)), 'year');
}

function viewSource(filePath: string, line: number) {
  showSnippet.value = true;
  snippetRef.value?.loadSnippet(filePath, line);
}

function hasEdgeLoc(edge: GraphEdge): boolean {
  return !!(edge.loc?.filePath && edge.loc?.line);
}

function confidenceColor(edge: GraphEdge): string | null {
  const c = edge.metadata?.confidence as string | undefined;
  if (!c) return null;
  switch (c) {
    case 'high': return '#42b883';
    case 'medium': return '#f59e0b';
    case 'low': return '#6b7280';
    default: return null;
  }
}

function hasNodeLoc(node: GraphNode): boolean {
  return !!(node.loc?.filePath && node.loc?.line);
}

// --- E2E Chain Summary ---
interface ChainPath {
  nodeIds: string[];
  labels: string[];
  kinds: string[];
  semantic: string;
}

function getChainSemantic(nodeIds: string[]): string {
  if (nodeIds.length < 2) return '';
  const firstNode = graphStore.graphData?.nodes.find(n => n.id === nodeIds[0]);
  const lastNode = graphStore.graphData?.nodes.find(n => n.id === nodeIds[nodeIds.length - 1]);
  if (!firstNode || !lastNode) return '';

  const fk = firstNode.kind;
  const lk = lastNode.kind;

  // Frontend → API
  if (['vue-component', 'vue-composable', 'pinia-store', 'api-call-site'].includes(fk)
      && ['spring-endpoint', 'spring-controller', 'spring-service'].includes(lk))
    return 'Frontend → API';

  // API → Database
  if (['spring-controller', 'spring-endpoint', 'spring-service'].includes(fk)
      && ['db-table', 'mybatis-mapper', 'mybatis-statement'].includes(lk))
    return 'API → Database';

  // Full chain: Frontend → Database
  if (['vue-component', 'vue-composable', 'pinia-store', 'api-call-site'].includes(fk)
      && ['db-table', 'mybatis-mapper', 'mybatis-statement'].includes(lk))
    return 'Frontend → Database';

  // Reverse: Database → API
  if (['db-table', 'mybatis-mapper', 'mybatis-statement'].includes(fk)
      && ['spring-controller', 'vue-component'].includes(lk))
    return 'Database → API';

  // Navigation
  if (fk === 'vue-router-route' && lk === 'vue-component')
    return 'Navigation';

  // Event flow
  if (fk === 'vue-event' || lk === 'vue-event' || fk === 'spring-event' || lk === 'spring-event')
    return 'Event Flow';

  return `${NODE_LABELS[firstNode.kind] ?? fk} → ${NODE_LABELS[lastNode.kind] ?? lk}`;
}

const chainPaths = ref<ChainPath[]>([]);
const chainLoading = ref(false);
let chainAbort: AbortController | null = null;

// Determine target kinds to search for based on the selected node's kind
function getChainTargets(kind: NodeKind): { targetKinds: NodeKind[]; direction: 'forward' | 'reverse' } {
  switch (kind) {
    case 'vue-component':
    case 'vue-composable':
    case 'pinia-store':
    case 'api-call-site':
      return { targetKinds: ['spring-endpoint', 'spring-controller'], direction: 'forward' };
    case 'spring-controller':
    case 'spring-endpoint':
    case 'spring-service':
      return { targetKinds: ['db-table', 'mybatis-statement'], direction: 'forward' };
    case 'db-table':
    case 'mybatis-mapper':
    case 'mybatis-statement':
      return { targetKinds: ['spring-controller', 'vue-component'], direction: 'reverse' };
    case 'vue-router-route':
      return { targetKinds: ['vue-component'], direction: 'forward' };
    default:
      return { targetKinds: ['db-table', 'spring-endpoint'], direction: 'forward' };
  }
}

function nodeLabel(nodeId: string): string {
  const node = graphStore.graphData?.nodes.find(n => n.id === nodeId);
  return node?.label ?? nodeId.split(':').pop() ?? nodeId;
}

function nodeKindLabel(nodeId: string): string {
  const node = graphStore.graphData?.nodes.find(n => n.id === nodeId);
  return node ? (NODE_LABELS[node.kind] ?? node.kind) : '';
}

async function loadChainSummary(nodeId: string, kind: NodeKind) {
  chainAbort?.abort();
  chainAbort = new AbortController();
  const signal = chainAbort.signal;

  chainPaths.value = [];
  chainLoading.value = true;

  try {
    const { targetKinds, direction } = getChainTargets(kind);
    if (!graphStore.graphData) return;

    // Find candidate target nodes
    const candidates = graphStore.graphData.nodes
      .filter(n => targetKinds.includes(n.kind))
      .slice(0, 10); // limit candidates to avoid excessive API calls

    const foundPaths: ChainPath[] = [];

    for (const candidate of candidates) {
      if (signal.aborted) return;
      if (foundPaths.length >= 3) break;

      const from = direction === 'forward' ? nodeId : candidate.id;
      const to = direction === 'forward' ? candidate.id : nodeId;

      try {
        const res = await apiFetch(
          `/api/graph/paths?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&maxDepth=8`,
          { signal }
        );
        const data = await res.json();
        const paths: string[][] = data.paths || [];
        if (paths.length > 0) {
          // Take the shortest path
          const shortest = paths.reduce((a, b) => a.length <= b.length ? a : b);
          // Avoid duplicate paths
          const key = shortest.join('→');
          if (!foundPaths.some(p => p.nodeIds.join('→') === key)) {
            foundPaths.push({
              nodeIds: shortest,
              labels: shortest.map(nodeLabel),
              kinds: shortest.map(nodeKindLabel),
              semantic: getChainSemantic(shortest),
            });
          }
        }
      } catch {
        // individual path fetch failed, continue
      }
    }

    if (!signal.aborted) {
      chainPaths.value = foundPaths;
    }
  } finally {
    if (!signal.aborted) {
      chainLoading.value = false;
    }
  }
}

watch(() => graphStore.selectedNode, (node) => {
  if (node) {
    loadChainSummary(node.id, node.kind);
  } else {
    chainPaths.value = [];
  }
}, { immediate: true });
</script>

<template>
  <div v-if="graphStore.selectedNode" class="p-4 space-y-4 overflow-y-auto h-full text-sm">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span
          class="w-4 h-4 rounded-full"
          :style="{ backgroundColor: NODE_COLORS[graphStore.selectedNode.kind] }"
        ></span>
        <h2 class="text-lg font-bold text-white">{{ graphStore.selectedNode.label }}</h2>
      </div>
      <button
        @click="graphStore.selectNode(null)"
        class="text-gray-500 hover:text-white"
      >
        &times;
      </button>
    </div>

    <div class="space-y-1">
      <p class="text-gray-400">
        <span class="text-gray-500">Type:</span>
        {{ NODE_LABELS[graphStore.selectedNode.kind] }}
      </p>
      <p class="text-gray-400 break-all flex items-center gap-1">
        <span class="text-gray-500">File:</span>
        {{ graphStore.selectedNode.filePath }}
        <button
          v-if="hasNodeLoc(graphStore.selectedNode)"
          @click="viewSource(graphStore.selectedNode.loc!.filePath, graphStore.selectedNode.loc!.line)"
          class="flex-shrink-0 text-xs px-1 rounded hover:bg-gray-600"
          title="View Source"
        >📄</button>
      </p>
    </div>

    <!-- Phase 9-13 — OTel runtime stats -->
    <div v-if="graphStore.selectedNode.kind === 'spring-endpoint' && (graphStore.selectedNode.metadata as any).p95Ms !== undefined" class="rounded p-2" style="background: rgba(0,0,0,0.25)">
      <h3 class="font-semibold text-gray-300 mb-1 text-xs">📡 Runtime (OTel)</h3>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div class="text-gray-500">p95</div>
          <div class="font-mono text-white">{{ (graphStore.selectedNode.metadata as any).p95Ms }}ms</div>
        </div>
        <div>
          <div class="text-gray-500">error rate</div>
          <div class="font-mono" :style="{ color: ((graphStore.selectedNode.metadata as any).errorRate || 0) > 0 ? '#ef4444' : '#22c55e' }">
            {{ (((graphStore.selectedNode.metadata as any).errorRate || 0) * 100).toFixed(1) }}%
          </div>
        </div>
        <div>
          <div class="text-gray-500">traces</div>
          <div class="font-mono text-white">{{ (graphStore.selectedNode.metadata as any).traceCount }}</div>
        </div>
      </div>
    </div>

    <!-- Phase 9-9 — Patterns -->
    <div v-if="tagsForCurrentNode().length > 0">
      <h3 class="font-semibold text-gray-300 mb-1">Patterns</h3>
      <div class="space-y-1">
        <div v-for="t in tagsForCurrentNode()" :key="t"
             class="rounded p-2 text-xs"
             :style="{ background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${tagColor(t)}` }">
          <div class="font-mono" :style="{ color: tagColor(t) }">{{ t }}</div>
          <div class="mt-0.5 text-gray-300">{{ antiPatterns?.suggestions?.[t] }}</div>
        </div>
      </div>
    </div>

    <!-- Phase 13-10 — DB table columns (when DDL ingested). Shows the
         column list with type + nullable hint. Drift markers (added /
         removed / changed) come from a sibling /api/analysis/schema-diff
         lookup once a baseline label is set; absent here keeps the panel
         lean. The column list alone is the headline value. -->
    <div v-if="graphStore.selectedNode.kind === 'db-table' && Array.isArray((graphStore.selectedNode.metadata as any).columns) && (graphStore.selectedNode.metadata as any).columns.length > 0" class="rounded p-2" style="background: rgba(0,0,0,0.25)">
      <h3 class="font-semibold text-gray-300 mb-1 text-xs">🗄️ Columns ({{ (graphStore.selectedNode.metadata as any).columns.length }})</h3>
      <div class="text-xs space-y-0.5 max-h-64 overflow-y-auto">
        <div v-for="col in ((graphStore.selectedNode.metadata as any).columns as Array<{name:string;type:string;nullable?:boolean;default?:string}>)"
             :key="col.name" class="flex items-baseline gap-2 font-mono">
          <span style="color: var(--text-primary)">{{ col.name }}</span>
          <span style="color: var(--text-tertiary)">{{ col.type }}</span>
          <span v-if="col.nullable === false" style="color: #f59e0b">NOT NULL</span>
          <span v-if="col.default !== undefined && col.default !== null" style="color: var(--text-tertiary)">= {{ col.default }}</span>
        </div>
      </div>
      <div class="text-[10px] mt-1" style="color: var(--text-tertiary)">
        ddlSource: {{ (graphStore.selectedNode.metadata as any).ddlSource || 'unknown' }}
      </div>
    </div>

    <!-- Phase 11-3 — Last touched (only when withGitBlame populated metadata). -->
    <div v-if="(graphStore.selectedNode.metadata as any).lastTouchedAt" class="rounded p-2" style="background: rgba(0,0,0,0.25)">
      <h3 class="font-semibold text-gray-300 mb-1 text-xs">🕒 Last touched</h3>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div class="text-gray-500">when</div>
          <div class="font-mono text-white" :title="(graphStore.selectedNode.metadata as any).lastTouchedAt">
            {{ formatLastTouched((graphStore.selectedNode.metadata as any).lastTouchedAt) }}
          </div>
        </div>
        <div>
          <div class="text-gray-500">author</div>
          <div class="font-mono text-white truncate" :title="(graphStore.selectedNode.metadata as any).lastAuthor">
            {{ (graphStore.selectedNode.metadata as any).lastAuthor || '—' }}
          </div>
        </div>
        <div>
          <div class="text-gray-500">commits / sha</div>
          <div class="font-mono text-white">
            {{ (graphStore.selectedNode.metadata as any).commitCount }} ·
            <span class="text-gray-400">{{ (graphStore.selectedNode.metadata as any).lastCommitSha }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Metadata -->
    <div v-if="Object.keys(graphStore.selectedNode.metadata).length > 0">
      <h3 class="font-semibold text-gray-300 mb-1">Metadata</h3>
      <div class="bg-gray-800 rounded p-2 space-y-1">
        <div v-for="(value, key) in graphStore.selectedNode.metadata" :key="String(key)">
          <span class="text-gray-500">{{ key }}:</span>
          <span class="text-gray-300 ml-1">
            {{ Array.isArray(value) ? (value as string[]).join(', ') : String(value) }}
          </span>
        </div>
      </div>
    </div>

    <!-- E2E Chain Summary -->
    <div v-if="chainLoading || chainPaths.length > 0">
      <h3 class="font-semibold text-gray-300 mb-1">
        Chain Summary
        <span v-if="chainLoading" class="text-gray-500 text-xs ml-1">loading...</span>
      </h3>
      <div v-if="chainPaths.length > 0" class="space-y-2">
        <div
          v-for="(chain, ci) in chainPaths"
          :key="ci"
          class="bg-gray-800 rounded p-2"
        >
          <div class="flex flex-wrap items-center gap-1">
            <template v-for="(nid, ni) in chain.nodeIds" :key="nid">
              <button
                @click="graphStore.selectNode(nid)"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs hover:bg-gray-600 border border-gray-600"
                :title="chain.kinds[ni]"
              >
                <span
                  class="w-2 h-2 rounded-full inline-block"
                  :style="{ backgroundColor: NODE_COLORS[graphStore.graphData?.nodes.find(n => n.id === nid)?.kind ?? 'ts-module'] }"
                ></span>
                <span class="text-gray-200">{{ chain.labels[ni] }}</span>
              </button>
              <span v-if="ni < chain.nodeIds.length - 1" class="text-gray-500 text-xs">→</span>
            </template>
          </div>
          <div class="flex items-center gap-2 text-xs mt-1">
            <span class="text-gray-500">{{ chain.nodeIds.length }} hops</span>
            <span
              v-if="chain.semantic"
              class="px-1.5 py-0.5 rounded text-xs font-medium"
              style="background: rgba(66, 184, 131, 0.15); color: #42b883"
            >{{ chain.semantic }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Outgoing edges -->
    <div v-if="graphStore.selectedNodeEdges.outgoing.length > 0">
      <h3 class="font-semibold text-gray-300 mb-1">
        Dependencies ({{ graphStore.selectedNodeEdges.outgoing.length }})
      </h3>
      <div class="space-y-1">
        <div
          v-for="edge in graphStore.selectedNodeEdges.outgoing"
          :key="edge.id"
          class="w-full text-left px-2 py-1 rounded hover:bg-gray-700 flex items-center gap-2"
        >
          <button
            @click="graphStore.selectNode(edge.target)"
            class="flex items-center gap-2 min-w-0 flex-1"
          >
            <span class="text-blue-400">→</span>
            <span class="text-gray-400 text-xs">{{ edge.kind }}</span>
            <span
              v-if="confidenceColor(edge)"
              class="w-1.5 h-1.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: confidenceColor(edge)! }"
              :title="'Confidence: ' + (edge.metadata?.confidence || 'unknown')"
            ></span>
            <span class="text-gray-300 truncate">{{ edge.target }}</span>
          </button>
          <button
            v-if="hasEdgeLoc(edge)"
            @click.stop="viewSource(edge.loc!.filePath, edge.loc!.line)"
            class="flex-shrink-0 text-xs px-1 rounded hover:bg-gray-600"
            title="View Source"
          >📄</button>
        </div>
      </div>
    </div>

    <!-- Incoming edges -->
    <div v-if="graphStore.selectedNodeEdges.incoming.length > 0">
      <h3 class="font-semibold text-gray-300 mb-1">
        Dependents ({{ graphStore.selectedNodeEdges.incoming.length }})
      </h3>
      <div class="space-y-1">
        <div
          v-for="edge in graphStore.selectedNodeEdges.incoming"
          :key="edge.id"
          class="w-full text-left px-2 py-1 rounded hover:bg-gray-700 flex items-center gap-2"
        >
          <button
            @click="graphStore.selectNode(edge.source)"
            class="flex items-center gap-2 min-w-0 flex-1"
          >
            <span class="text-green-400">←</span>
            <span class="text-gray-400 text-xs">{{ edge.kind }}</span>
            <span
              v-if="confidenceColor(edge)"
              class="w-1.5 h-1.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: confidenceColor(edge)! }"
              :title="'Confidence: ' + (edge.metadata?.confidence || 'unknown')"
            ></span>
            <span class="text-gray-300 truncate">{{ edge.source }}</span>
          </button>
          <button
            v-if="hasEdgeLoc(edge)"
            @click.stop="viewSource(edge.loc!.filePath, edge.loc!.line)"
            class="flex-shrink-0 text-xs px-1 rounded hover:bg-gray-600"
            title="View Source"
          >📄</button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="p-4 flex items-center justify-center h-full">
    <p class="text-gray-600 text-sm">Click a node to see details</p>
  </div>

  <SourceSnippet
    ref="snippetRef"
    :show="showSnippet"
    @close="showSnippet = false"
  />
</template>
