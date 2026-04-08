<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import { useUiStore } from '@/stores/ui';
import { NODE_STYLES, NODE_LABELS, EDGE_STYLES } from '@/types/graph';
import type { NodeKind, EdgeKind } from '@/types/graph';

const graphStore = useGraphStore();
const uiStore = useUiStore();

const nodeKinds = Object.keys(NODE_STYLES) as NodeKind[];
const edgeKinds = Object.keys(EDGE_STYLES) as EdgeKind[];

// Count from TOTAL graph data (not filtered) so legend always shows all kinds
const nodeCounts = computed(() => {
  const counts: Record<string, number> = {};
  if (graphStore.graphData) {
    for (const n of graphStore.graphData.nodes) {
      counts[n.kind] = (counts[n.kind] || 0) + 1;
    }
  }
  return counts;
});

// Show all kinds that exist in the graph (not just filtered)
const activeNodeKinds = computed(() =>
  nodeKinds.filter(k => (nodeCounts.value[k] || 0) > 0)
);
</script>

<template>
  <div
    class="absolute top-3 right-3 z-40"
    @mouseenter="uiStore.legendExpanded = true"
    @mouseleave="uiStore.legendExpanded = false"
  >
    <!-- Collapsed button -->
    <button
      v-if="!uiStore.legendExpanded"
      class="rounded-lg p-2 text-xs border backdrop-blur-sm transition-all"
      style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-secondary)"
      @click="uiStore.legendExpanded = true"
    >
      Legend
    </button>

    <!-- Expanded panel -->
    <Transition name="fade">
      <div
        v-if="uiStore.legendExpanded"
        class="rounded-lg border p-3 min-w-[180px] max-h-[60vh] overflow-y-auto backdrop-blur-sm"
        style="background: var(--surface-elevated); border-color: var(--border-subtle)"
      >
        <h4 class="text-xs font-semibold mb-2" style="color: var(--text-primary)">Nodes</h4>
        <div class="space-y-1 mb-3">
          <button
            v-for="kind in activeNodeKinds"
            :key="kind"
            @click="graphStore.toggleNodeKind(kind)"
            class="flex items-center gap-2 w-full px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-white/5"
            :style="{ opacity: graphStore.activeNodeKinds.has(kind) ? 1 : 0.4 }"
          >
            <span
              class="w-3 h-3 rounded-sm flex-shrink-0"
              :style="{ backgroundColor: NODE_STYLES[kind].color }"
            ></span>
            <span style="color: var(--text-secondary)">{{ NODE_LABELS[kind] }}</span>
            <span class="ml-auto tabular-nums" style="color: var(--text-tertiary)">{{ nodeCounts[kind] || 0 }}</span>
          </button>
        </div>

        <h4 class="text-xs font-semibold mb-2" style="color: var(--text-primary)">Edges</h4>
        <div class="space-y-1">
          <button
            v-for="kind in edgeKinds"
            :key="kind"
            @click="graphStore.toggleEdgeKind(kind)"
            class="flex items-center gap-2 w-full px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-white/5"
            :style="{ opacity: graphStore.activeEdgeKinds.has(kind) ? 1 : 0.4 }"
          >
            <svg width="20" height="8" class="flex-shrink-0">
              <line
                x1="0" y1="4" x2="20" y2="4"
                :stroke="EDGE_STYLES[kind].color"
                stroke-width="2"
                :stroke-dasharray="EDGE_STYLES[kind].dashed ? '4 2' : 'none'"
              />
            </svg>
            <span style="color: var(--text-secondary)">{{ kind }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
