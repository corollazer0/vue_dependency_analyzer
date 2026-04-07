<script setup lang="ts">
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS, NODE_LABELS } from '@/types/graph';

const graphStore = useGraphStore();
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
      <p class="text-gray-400 break-all">
        <span class="text-gray-500">File:</span>
        {{ graphStore.selectedNode.filePath }}
      </p>
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

    <!-- Outgoing edges -->
    <div v-if="graphStore.selectedNodeEdges.outgoing.length > 0">
      <h3 class="font-semibold text-gray-300 mb-1">
        Dependencies ({{ graphStore.selectedNodeEdges.outgoing.length }})
      </h3>
      <div class="space-y-1">
        <button
          v-for="edge in graphStore.selectedNodeEdges.outgoing"
          :key="edge.id"
          @click="graphStore.selectNode(edge.target)"
          class="w-full text-left px-2 py-1 rounded hover:bg-gray-700 flex items-center gap-2"
        >
          <span class="text-blue-400">→</span>
          <span class="text-gray-400 text-xs">{{ edge.kind }}</span>
          <span class="text-gray-300 truncate">{{ edge.target }}</span>
        </button>
      </div>
    </div>

    <!-- Incoming edges -->
    <div v-if="graphStore.selectedNodeEdges.incoming.length > 0">
      <h3 class="font-semibold text-gray-300 mb-1">
        Dependents ({{ graphStore.selectedNodeEdges.incoming.length }})
      </h3>
      <div class="space-y-1">
        <button
          v-for="edge in graphStore.selectedNodeEdges.incoming"
          :key="edge.id"
          @click="graphStore.selectNode(edge.source)"
          class="w-full text-left px-2 py-1 rounded hover:bg-gray-700 flex items-center gap-2"
        >
          <span class="text-green-400">←</span>
          <span class="text-gray-400 text-xs">{{ edge.kind }}</span>
          <span class="text-gray-300 truncate">{{ edge.source }}</span>
        </button>
      </div>
    </div>
  </div>

  <div v-else class="p-4 flex items-center justify-center h-full">
    <p class="text-gray-600 text-sm">Click a node to see details</p>
  </div>
</template>
