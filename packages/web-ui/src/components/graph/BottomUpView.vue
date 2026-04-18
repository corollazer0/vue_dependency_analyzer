<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS, NODE_LABELS } from '@/types/graph';
import type { GraphNode, NodeKind } from '@/types/graph';

const graphStore = useGraphStore();

const dbTables = computed(() =>
  (graphStore.graphData?.nodes || []).filter(n => n.kind === 'db-table'),
);

const selectedTableId = ref<string | null>(null);

interface TraceNode {
  id: string;
  label: string;
  kind: NodeKind;
  depth: number;
  children: TraceNode[];
}

const traceTree = ref<TraceNode[]>([]);
const affectedComponents = ref<GraphNode[]>([]);

const REVERSE_SEMANTIC = new Set(['api-serves', 'mybatis-maps']);
const SKIP_KINDS = new Set(['dto-flows']);

watch(selectedTableId, (tableId) => {
  if (!tableId || !graphStore.graphData) {
    traceTree.value = [];
    affectedComponents.value = [];
    collapsedKeys.value = new Set();
    return;
  }
  buildTrace(tableId);
});

function buildTrace(rootId: string) {
  const nodes = graphStore.graphData!.nodes;
  const edges = graphStore.graphData!.edges;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const components: GraphNode[] = [];

  function traverse(nodeId: string, depth: number): TraceNode | null {
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return null;

    if (node.kind === 'vue-component' || node.kind === 'vue-composable' || node.kind === 'pinia-store') {
      components.push(node);
    }

    const children: TraceNode[] = [];
    const incoming = edges.filter(e => e.target === nodeId && !SKIP_KINDS.has(e.kind));
    for (const edge of incoming) {
      const child = traverse(edge.source, depth + 1);
      if (child) children.push(child);
    }
    const reverseOut = edges.filter(e => e.source === nodeId && REVERSE_SEMANTIC.has(e.kind));
    for (const edge of reverseOut) {
      const child = traverse(edge.target, depth + 1);
      if (child) children.push(child);
    }

    return { id: nodeId, label: node.label, kind: node.kind, depth, children };
  }

  const root = traverse(rootId, 0);
  traceTree.value = root ? [root] : [];
  affectedComponents.value = components;
  collapsedKeys.value = new Set();
}

// Phase 3-6 — virtualised trace tree.
//
// The previous implementation rendered the trace as a recursive component;
// every node in the upstream tree mounted its own Vue subtree, and a typical
// db-table → service → controller → component fan-out reached thousands of
// rendered nodes for a moderately central table. RecycleScroller flattens the
// visible-on-expand rows into a single virtual list so only the rows on screen
// pay any DOM cost.
//
// `collapsedKeys` is keyed on the path from root (e.g. "tableA/serviceB"), not
// the bare node id, because the same node can legitimately appear under
// multiple parents in a fan-in graph. Using bare ids would collapse every
// occurrence at once, hiding paths the user is actually inspecting.

interface FlatRow {
  key: string;
  nodeId: string;
  label: string;
  kind: NodeKind;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
}

const collapsedKeys = ref<Set<string>>(new Set());

const flatRows = computed<FlatRow[]>(() => {
  const out: FlatRow[] = [];
  function walk(node: TraceNode, parentKey: string) {
    const key = parentKey ? `${parentKey}/${node.id}` : node.id;
    const collapsed = collapsedKeys.value.has(key);
    out.push({
      key,
      nodeId: node.id,
      label: node.label,
      kind: node.kind,
      depth: node.depth,
      hasChildren: node.children.length > 0,
      collapsed,
    });
    if (!collapsed) {
      for (const child of node.children) walk(child, key);
    }
  }
  for (const root of traceTree.value) walk(root, '');
  return out;
});

function toggle(key: string) {
  const next = new Set(collapsedKeys.value);
  if (next.has(key)) next.delete(key); else next.add(key);
  collapsedKeys.value = next;
}

function selectNode(nodeId: string) {
  graphStore.focusNode(nodeId);
}

const ROW_HEIGHT = 24;
</script>

<template>
  <div class="w-full h-full flex flex-col p-4" style="background: var(--surface-primary)">
    <!-- Table selector -->
    <div class="mb-4 flex items-center gap-3 flex-shrink-0">
      <label class="text-xs font-medium" style="color: var(--text-secondary)">DB Table:</label>
      <select
        v-model="selectedTableId"
        class="rounded px-3 py-1.5 text-xs focus:outline-none"
        style="background: var(--surface-elevated); border: 1px solid var(--border-default); color: var(--text-primary)"
      >
        <option :value="null">Select a table...</option>
        <option v-for="t in dbTables" :key="t.id" :value="t.id">{{ t.label }}</option>
      </select>
      <span v-if="affectedComponents.length > 0" class="text-xs" style="color: var(--text-tertiary)">
        {{ affectedComponents.length }} affected component(s)
      </span>
    </div>

    <!-- Summary -->
    <div v-if="affectedComponents.length > 0" class="mb-4 rounded-md p-3 flex-shrink-0" style="background: var(--surface-elevated); border: 1px solid var(--border-subtle)">
      <div class="text-xs font-semibold mb-2" style="color: var(--text-primary)">
        If this table changes, these screens are affected:
      </div>
      <div class="flex flex-wrap gap-1 max-h-32 overflow-auto">
        <button
          v-for="c in affectedComponents" :key="c.id"
          @click="selectNode(c.id)"
          class="px-2 py-1 rounded text-xs hover:opacity-80 cursor-pointer"
          :style="{ background: NODE_COLORS[c.kind] + '25', color: NODE_COLORS[c.kind], border: '1px solid ' + NODE_COLORS[c.kind] + '50' }"
        >{{ c.label }}</button>
      </div>
    </div>

    <!-- Trace tree (virtualised) -->
    <RecycleScroller
      v-if="flatRows.length > 0"
      :items="flatRows"
      :item-size="ROW_HEIGHT"
      key-field="key"
      class="flex-1 min-h-0"
      v-slot="{ item }"
    >
      <div
        class="flex items-center gap-2 px-1 rounded hover:bg-white/5 cursor-pointer text-xs"
        :style="{ height: ROW_HEIGHT + 'px', paddingLeft: (item.depth * 16 + 4) + 'px' }"
        @click="selectNode(item.nodeId)"
      >
        <button
          v-if="item.hasChildren"
          class="w-4 text-center flex-shrink-0"
          style="color: var(--text-tertiary)"
          @click.stop="toggle(item.key)"
        >{{ item.collapsed ? '▸' : '▾' }}</button>
        <span v-else class="w-4 flex-shrink-0" />
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: NODE_COLORS[item.kind] }" />
        <span class="truncate" style="color: var(--text-primary)">{{ item.label }}</span>
        <span class="flex-shrink-0" style="color: var(--text-tertiary)">{{ NODE_LABELS[item.kind] }}</span>
      </div>
    </RecycleScroller>

    <div v-else-if="selectedTableId" class="text-center py-16 text-sm" style="color: var(--text-tertiary)">
      No reverse dependencies found for this table.
    </div>

    <div v-else class="text-center py-16 text-sm" style="color: var(--text-tertiary)">
      Select a DB table to trace its impact up to the frontend.
    </div>
  </div>
</template>
