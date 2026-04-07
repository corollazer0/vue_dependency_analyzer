<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import cytoscape from 'cytoscape';
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS } from '@/types/graph';

const graphStore = useGraphStore();
const container = ref<HTMLElement>();
let miniCy: cytoscape.Core | null = null;

function initMiniMap() {
  if (!container.value) return;

  const elements = graphStore.filteredNodes.map(n => ({
    data: { id: n.id, kind: n.kind },
  }));

  miniCy = cytoscape({
    container: container.value,
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'width': 4,
          'height': 4,
          'background-color': '#666',
          'label': '',
        },
      },
      ...Object.entries(NODE_COLORS).map(([kind, color]) => ({
        selector: `node[kind = "${kind}"]`,
        style: { 'background-color': color },
      })),
    ],
    layout: { name: 'grid' } as any,
    userZoomingEnabled: false,
    userPanningEnabled: false,
    boxSelectionEnabled: false,
    autoungrabify: true,
  });
}

watch(() => graphStore.filteredNodes.length, () => {
  nextTick(() => {
    miniCy?.destroy();
    initMiniMap();
  });
});

onMounted(() => {
  if (graphStore.filteredNodes.length > 0) {
    initMiniMap();
  }
});
</script>

<template>
  <div
    ref="container"
    class="w-full h-full bg-gray-800/50 rounded border border-gray-700"
  ></div>
</template>
