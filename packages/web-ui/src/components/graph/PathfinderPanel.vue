<script setup lang="ts">
import { ref } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import { EDGE_STYLES } from '@/types/graph';
import type { EdgeKind } from '@/types/graph';

const emit = defineEmits<{ close: [] }>();
const graphStore = useGraphStore();
const selectedPathIndex = ref<number | null>(null);

const fromQuery = ref('');
const toQuery = ref('');
const fromResults = ref<any[]>([]);
const toResults = ref<any[]>([]);
const selectedFrom = ref<string | null>(null);
const selectedTo = ref<string | null>(null);
const selectedFromLabel = ref('');
const selectedToLabel = ref('');
const paths = ref<string[][]>([]);
const pathCount = ref(0);
const loading = ref(false);
const searched = ref(false);

// Options
const maxDepth = ref(15);
const shortestOnly = ref(false);
const showOptions = ref(false);
const edgeKindList = Object.keys(EDGE_STYLES) as EdgeKind[];
const activeEdgeKinds = ref<Set<EdgeKind>>(new Set(edgeKindList));

let fromDebounce: ReturnType<typeof setTimeout>;
let toDebounce: ReturnType<typeof setTimeout>;

function searchFrom(q: string) {
  fromQuery.value = q;
  selectedFrom.value = null;
  selectedFromLabel.value = '';
  clearTimeout(fromDebounce);
  fromDebounce = setTimeout(async () => {
    if (!q.trim()) { fromResults.value = []; return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      fromResults.value = data.results || [];
    } catch { fromResults.value = []; }
  }, 200);
}

function searchTo(q: string) {
  toQuery.value = q;
  selectedTo.value = null;
  selectedToLabel.value = '';
  clearTimeout(toDebounce);
  toDebounce = setTimeout(async () => {
    if (!q.trim()) { toResults.value = []; return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      toResults.value = data.results || [];
    } catch { toResults.value = []; }
  }, 200);
}

function selectFrom(result: any) {
  selectedFrom.value = result.nodeId;
  selectedFromLabel.value = result.label;
  fromQuery.value = result.label;
  fromResults.value = [];
}

function selectTo(result: any) {
  selectedTo.value = result.nodeId;
  selectedToLabel.value = result.label;
  toQuery.value = result.label;
  toResults.value = [];
}

async function findPaths() {
  if (!selectedFrom.value || !selectedTo.value) return;
  loading.value = true;
  searched.value = true;
  try {
    let url = `/api/graph/paths?from=${encodeURIComponent(selectedFrom.value)}&to=${encodeURIComponent(selectedTo.value)}&maxDepth=${maxDepth.value}`;
    // Only send edgeKinds if not all are selected
    if (activeEdgeKinds.value.size < edgeKindList.length) {
      url += `&edgeKinds=${[...activeEdgeKinds.value].join(',')}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    let resultPaths: string[][] = data.paths || [];
    if (shortestOnly.value && resultPaths.length > 1) {
      const minLen = Math.min(...resultPaths.map(p => p.length));
      resultPaths = resultPaths.filter(p => p.length === minLen);
    }
    paths.value = resultPaths;
    pathCount.value = resultPaths.length;
  } catch {
    paths.value = [];
    pathCount.value = 0;
  } finally {
    loading.value = false;
  }
}

function nodeLabel(nodeId: string): string {
  const node = graphStore.graphData?.nodes.find(n => n.id === nodeId);
  return node?.label ?? nodeId.split(':').pop() ?? nodeId;
}

function edgeKindBetween(fromId: string, toId: string): string | null {
  const edge = graphStore.graphData?.edges.find(
    e => e.source === fromId && e.target === toId
  );
  return edge?.kind ?? null;
}

function edgeColor(kind: string): string {
  return (EDGE_STYLES as Record<string, { color: string }>)[kind]?.color ?? '#666';
}

function highlightPath(index: number) {
  selectedPathIndex.value = index;
  const path = paths.value[index];
  if (path) {
    graphStore.highlightedPath = path;
  }
}

function clear() {
  fromQuery.value = '';
  toQuery.value = '';
  fromResults.value = [];
  toResults.value = [];
  selectedFrom.value = null;
  selectedTo.value = null;
  selectedFromLabel.value = '';
  selectedToLabel.value = '';
  paths.value = [];
  pathCount.value = 0;
  searched.value = false;
  selectedPathIndex.value = null;
  graphStore.highlightedPath = [];
}
</script>

<template>
  <div
    class="absolute inset-0 z-30 flex items-start justify-center pt-16"
    style="background: var(--surface-overlay)"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-lg rounded-lg shadow-2xl overflow-hidden"
      style="background: var(--surface-elevated); border: 1px solid var(--border-default)"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: var(--border-subtle)">
        <h2 class="text-sm font-semibold" style="color: var(--text-primary)">Pathfinder (A &rarr; B)</h2>
        <div class="flex items-center gap-2">
          <button
            @click="clear"
            class="px-2 py-1 text-xs rounded transition-colors"
            style="color: var(--text-tertiary)"
          >Clear</button>
          <button
            @click="emit('close')"
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            style="color: var(--text-tertiary)"
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-3">
        <!-- From input -->
        <div class="relative">
          <label class="block text-xs mb-1" style="color: var(--text-tertiary)">From</label>
          <input
            :value="fromQuery"
            @input="searchFrom(($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="Search source node..."
            class="w-full rounded px-3 py-2 text-sm focus:outline-none"
            style="background: var(--surface-primary); border: 1px solid var(--border-default); color: var(--text-primary)"
            :style="selectedFrom ? { borderColor: 'var(--accent-vue)' } : {}"
          />
          <div
            v-if="fromResults.length > 0"
            class="absolute left-0 right-0 mt-1 rounded-md shadow-lg max-h-40 overflow-y-auto z-40"
            style="background: var(--surface-elevated); border: 1px solid var(--border-default)"
          >
            <button
              v-for="r in fromResults"
              :key="r.nodeId"
              @click="selectFrom(r)"
              class="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
              style="color: var(--text-secondary)"
            >
              <span class="truncate">{{ r.label }}</span>
              <span class="text-xs ml-auto flex-shrink-0" style="color: var(--text-tertiary)">{{ r.kind }}</span>
            </button>
          </div>
        </div>

        <!-- To input -->
        <div class="relative">
          <label class="block text-xs mb-1" style="color: var(--text-tertiary)">To</label>
          <input
            :value="toQuery"
            @input="searchTo(($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="Search target node..."
            class="w-full rounded px-3 py-2 text-sm focus:outline-none"
            style="background: var(--surface-primary); border: 1px solid var(--border-default); color: var(--text-primary)"
            :style="selectedTo ? { borderColor: 'var(--accent-vue)' } : {}"
          />
          <div
            v-if="toResults.length > 0"
            class="absolute left-0 right-0 mt-1 rounded-md shadow-lg max-h-40 overflow-y-auto z-40"
            style="background: var(--surface-elevated); border: 1px solid var(--border-default)"
          >
            <button
              v-for="r in toResults"
              :key="r.nodeId"
              @click="selectTo(r)"
              class="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
              style="color: var(--text-secondary)"
            >
              <span class="truncate">{{ r.label }}</span>
              <span class="text-xs ml-auto flex-shrink-0" style="color: var(--text-tertiary)">{{ r.kind }}</span>
            </button>
          </div>
        </div>

        <!-- Options toggle -->
        <button
          @click="showOptions = !showOptions"
          class="w-full text-left text-xs py-1 transition-colors"
          style="color: var(--text-tertiary)"
        >{{ showOptions ? '▾' : '▸' }} Options</button>

        <!-- Options panel -->
        <div v-if="showOptions" class="space-y-2 rounded-md p-3 text-xs" style="background: var(--surface-primary); border: 1px solid var(--border-subtle)">
          <div class="flex items-center gap-3">
            <label style="color: var(--text-secondary)">Max depth:</label>
            <input
              type="range" :min="3" :max="25" v-model.number="maxDepth"
              class="flex-1 h-1 rounded-lg appearance-none cursor-pointer"
              style="accent-color: var(--accent-blue)"
            />
            <span class="w-6 text-right" style="color: var(--text-primary)">{{ maxDepth }}</span>
          </div>
          <label class="flex items-center gap-2 cursor-pointer" style="color: var(--text-secondary)">
            <input type="checkbox" v-model="shortestOnly" class="rounded" />
            Shortest paths only
          </label>
          <div>
            <label class="block mb-1" style="color: var(--text-secondary)">Edge types:</label>
            <div class="flex flex-wrap gap-1">
              <label
                v-for="kind in edgeKindList" :key="kind"
                class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer text-xs"
                :style="{
                  background: activeEdgeKinds.has(kind) ? EDGE_STYLES[kind].color + '25' : 'transparent',
                  color: activeEdgeKinds.has(kind) ? EDGE_STYLES[kind].color : 'var(--text-tertiary)',
                  border: '1px solid ' + (activeEdgeKinds.has(kind) ? EDGE_STYLES[kind].color + '50' : 'var(--border-subtle)'),
                }"
              >
                <input
                  type="checkbox"
                  :checked="activeEdgeKinds.has(kind)"
                  @change="activeEdgeKinds.has(kind) ? activeEdgeKinds.delete(kind) : activeEdgeKinds.add(kind)"
                  class="hidden"
                />
                {{ kind }}
              </label>
            </div>
          </div>
        </div>

        <!-- Find button -->
        <button
          @click="findPaths"
          :disabled="!selectedFrom || !selectedTo || loading"
          class="w-full py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40"
          style="background: var(--accent-blue); color: #fff"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Searching...
          </span>
          <span v-else>Find Paths</span>
        </button>

        <!-- Results -->
        <div v-if="searched && !loading" class="space-y-2">
          <p class="text-xs" style="color: var(--text-tertiary)">
            {{ pathCount }} path{{ pathCount === 1 ? '' : 's' }} found
          </p>
          <div
            v-if="paths.length === 0"
            class="text-center py-4 text-xs"
            style="color: var(--text-tertiary)"
          >
            No paths between these nodes.
          </div>
          <div v-else class="max-h-60 overflow-y-auto space-y-2">
            <div
              v-for="(path, i) in paths"
              :key="i"
              class="rounded-md px-3 py-2 text-xs cursor-pointer transition-colors"
              :style="{
                background: selectedPathIndex === i ? 'rgba(52, 152, 219, 0.15)' : 'var(--surface-primary)',
                border: selectedPathIndex === i ? '1px solid rgba(52, 152, 219, 0.5)' : '1px solid var(--border-subtle)',
              }"
              @click="highlightPath(i)"
              title="Click to highlight on graph"
            >
              <span class="font-mono" style="color: var(--text-tertiary)">#{{ i + 1 }}</span>
              <span class="ml-2" style="color: var(--text-secondary)">{{ path.length - 1 }} hop{{ path.length - 1 === 1 ? '' : 's' }}</span>
              <div class="mt-1 flex flex-wrap items-center gap-1">
                <template v-for="(node, j) in path" :key="j">
                  <span
                    class="px-1.5 py-0.5 rounded text-xs"
                    style="background: var(--surface-elevated); color: var(--text-primary)"
                    :title="node"
                  >{{ nodeLabel(node) }}</span>
                  <template v-if="j < path.length - 1">
                    <span
                      v-if="edgeKindBetween(node, path[j + 1])"
                      class="text-xs px-1"
                      :style="{ color: edgeColor(edgeKindBetween(node, path[j + 1])!) }"
                    >{{ edgeKindBetween(node, path[j + 1]) }} →</span>
                    <span v-else style="color: var(--text-tertiary)">→</span>
                  </template>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
