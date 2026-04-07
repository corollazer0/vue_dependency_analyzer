<script setup lang="ts">
import { ref, watch } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS } from '@/types/graph';

const graphStore = useGraphStore();
const query = ref('');
let debounceTimer: ReturnType<typeof setTimeout>;

watch(query, (val) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    graphStore.search(val);
  }, 300);
});
</script>

<template>
  <div class="p-3 space-y-3">
    <input
      v-model="query"
      type="text"
      placeholder="Search nodes..."
      class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
    />
    <div class="space-y-1 max-h-96 overflow-y-auto">
      <button
        v-for="result in graphStore.searchResults"
        :key="result.nodeId"
        @click="graphStore.selectNode(result.nodeId)"
        class="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 flex items-center gap-2"
      >
        <span
          class="w-2.5 h-2.5 rounded-full flex-shrink-0"
          :style="{ backgroundColor: NODE_COLORS[result.kind] }"
        ></span>
        <span class="text-gray-300 text-sm truncate">{{ result.label }}</span>
        <span class="text-gray-600 text-xs ml-auto">{{ result.kind }}</span>
      </button>
    </div>
  </div>
</template>
