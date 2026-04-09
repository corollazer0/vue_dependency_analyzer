<script setup lang="ts">
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS, NODE_LABELS, EDGE_STYLES } from '@/types/graph';
import type { NodeKind, EdgeKind } from '@/types/graph';

const graphStore = useGraphStore();

const nodeKindList = Object.keys(NODE_COLORS) as NodeKind[];
const edgeKindList = Object.keys(EDGE_STYLES) as EdgeKind[];
</script>

<template>
  <div class="p-3 space-y-4 text-sm overflow-y-auto h-full">
    <!-- Filter Presets -->
    <div>
      <h3 class="font-semibold text-gray-300 mb-2">Presets</h3>
      <div class="flex flex-wrap gap-1 mb-3">
        <button @click="graphStore.applyFilterPreset('all')" class="rounded px-2 py-1 text-xs border" style="background: var(--surface-elevated, #1a1f2e); border-color: var(--border-subtle, #2a2f3e); color: var(--text-secondary, #a0a8b8)">All</button>
        <button @click="graphStore.applyFilterPreset('none')" class="rounded px-2 py-1 text-xs border" style="background: var(--surface-elevated, #1a1f2e); border-color: var(--border-subtle, #2a2f3e); color: var(--text-secondary, #a0a8b8)">None</button>
        <button @click="graphStore.applyFilterPreset('vue')" class="rounded px-2 py-1 text-xs border" style="background: var(--surface-elevated, #1a1f2e); border-color: var(--border-subtle, #2a2f3e); color: #42b883">Vue</button>
        <button @click="graphStore.applyFilterPreset('spring')" class="rounded px-2 py-1 text-xs border" style="background: var(--surface-elevated, #1a1f2e); border-color: var(--border-subtle, #2a2f3e); color: #6db33f">Spring</button>
        <button @click="graphStore.applyFilterPreset('db')" class="rounded px-2 py-1 text-xs border" style="background: var(--surface-elevated, #1a1f2e); border-color: var(--border-subtle, #2a2f3e); color: #00bcd4">DB Chain</button>
        <button @click="graphStore.applyFilterPreset('api')" class="rounded px-2 py-1 text-xs border" style="background: var(--surface-elevated, #1a1f2e); border-color: var(--border-subtle, #2a2f3e); color: #ef4444">API</button>
      </div>
    </div>

    <div>
      <h3 class="font-semibold text-gray-300 mb-2">Node Types</h3>
      <div v-for="kind in nodeKindList" :key="kind" class="flex items-center gap-2 py-0.5">
        <input
          type="checkbox"
          :checked="graphStore.activeNodeKinds.has(kind)"
          @change="graphStore.toggleNodeKind(kind)"
          class="rounded"
        />
        <span
          class="w-3 h-3 rounded-full inline-block"
          :style="{ backgroundColor: NODE_COLORS[kind] }"
        ></span>
        <span class="text-gray-400">{{ NODE_LABELS[kind] }}</span>
      </div>
    </div>

    <div>
      <h3 class="font-semibold text-gray-300 mb-2">Edge Types</h3>
      <div v-for="kind in edgeKindList" :key="kind" class="flex items-center gap-2 py-0.5">
        <input
          type="checkbox"
          :checked="graphStore.activeEdgeKinds.has(kind)"
          @change="graphStore.toggleEdgeKind(kind)"
          class="rounded"
        />
        <span
          class="w-6 h-0.5 inline-block"
          :style="{
            backgroundColor: EDGE_STYLES[kind].color,
            borderTop: EDGE_STYLES[kind].dashed ? '2px dashed ' + EDGE_STYLES[kind].color : 'none',
          }"
        ></span>
        <span class="text-gray-400">{{ kind }}</span>
      </div>
    </div>
  </div>
</template>
