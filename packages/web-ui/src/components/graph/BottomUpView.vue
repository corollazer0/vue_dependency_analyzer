<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS, NODE_LABELS } from '@/types/graph';
import type { GraphNode, NodeKind } from '@/types/graph';

const graphStore = useGraphStore();

// DB tables from the graph
const dbTables = computed(() =>
  (graphStore.graphData?.nodes || []).filter(n => n.kind === 'db-table')
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

// Reverse-semantic edges (direction should be flipped during traversal)
const REVERSE_SEMANTIC = new Set(['api-serves', 'mybatis-maps']);
const SKIP_KINDS = new Set(['dto-flows']);

watch(selectedTableId, (tableId) => {
  if (!tableId || !graphStore.graphData) {
    traceTree.value = [];
    affectedComponents.value = [];
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

    // Incoming edges: who depends on this node
    const incoming = edges.filter(e => e.target === nodeId && !SKIP_KINDS.has(e.kind));
    for (const edge of incoming) {
      const child = traverse(edge.source, depth + 1);
      if (child) children.push(child);
    }

    // Reverse-semantic edges: follow outgoing edges where the semantic direction reverses
    const reverseOut = edges.filter(e => e.source === nodeId && REVERSE_SEMANTIC.has(e.kind));
    for (const edge of reverseOut) {
      const child = traverse(edge.target, depth + 1);
      if (child) children.push(child);
    }

    return {
      id: nodeId,
      label: node.label,
      kind: node.kind,
      depth,
      children,
    };
  }

  const root = traverse(rootId, 0);
  traceTree.value = root ? [root] : [];
  affectedComponents.value = components;
}

function selectNode(nodeId: string) {
  graphStore.focusNode(nodeId);
}
</script>

<template>
  <div class="w-full h-full overflow-auto p-4" style="background: var(--surface-primary)">
    <!-- Table selector -->
    <div class="mb-4 flex items-center gap-3">
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
    <div v-if="affectedComponents.length > 0" class="mb-4 rounded-md p-3" style="background: var(--surface-elevated); border: 1px solid var(--border-subtle)">
      <div class="text-xs font-semibold mb-2" style="color: var(--text-primary)">
        If this table changes, these screens are affected:
      </div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="c in affectedComponents" :key="c.id"
          @click="selectNode(c.id)"
          class="px-2 py-1 rounded text-xs hover:opacity-80 cursor-pointer"
          :style="{ background: NODE_COLORS[c.kind] + '25', color: NODE_COLORS[c.kind], border: '1px solid ' + NODE_COLORS[c.kind] + '50' }"
        >{{ c.label }}</button>
      </div>
    </div>

    <!-- Trace tree -->
    <div v-if="traceTree.length > 0" class="space-y-1">
      <BottomUpTreeNode
        v-for="node in traceTree" :key="node.id"
        :node="node"
        @select="selectNode"
      />
    </div>

    <div v-else-if="selectedTableId" class="text-center py-16 text-sm" style="color: var(--text-tertiary)">
      No reverse dependencies found for this table.
    </div>

    <div v-else class="text-center py-16 text-sm" style="color: var(--text-tertiary)">
      Select a DB table to trace its impact up to the frontend.
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue';

// Recursive tree node component
const BottomUpTreeNode = defineComponent({
  name: 'BottomUpTreeNode',
  props: {
    node: { type: Object, required: true },
  },
  emits: ['select'],
  setup(props, { emit }) {
    const expanded = ref(true);

    return () => {
      const n = props.node as TraceNode;
      const color = NODE_COLORS[n.kind] || '#666';
      const kindLabel = NODE_LABELS[n.kind] || n.kind;

      return h('div', { style: { paddingLeft: '16px' } }, [
        h('div', {
          class: 'flex items-center gap-2 py-0.5 px-1 rounded hover:bg-white/5 cursor-pointer text-xs',
          onClick: () => emit('select', n.id),
        }, [
          n.children.length > 0
            ? h('button', {
                class: 'w-4 text-center',
                style: { color: 'var(--text-tertiary)' },
                onClick: (e: Event) => { e.stopPropagation(); expanded.value = !expanded.value; },
              }, expanded.value ? '▾' : '▸')
            : h('span', { class: 'w-4' }),
          h('span', { class: 'w-2.5 h-2.5 rounded-full flex-shrink-0', style: { backgroundColor: color } }),
          h('span', { style: { color: 'var(--text-primary)' } }, n.label),
          h('span', { style: { color: 'var(--text-tertiary)' } }, kindLabel),
        ]),
        expanded.value && n.children.length > 0
          ? h('div', {}, n.children.map((child: TraceNode) =>
              h(BottomUpTreeNode, { node: child, onSelect: (id: string) => emit('select', id) })
            ))
          : null,
      ]);
    };
  },
});

interface TraceNode {
  id: string;
  label: string;
  kind: string;
  depth: number;
  children: TraceNode[];
}
</script>
