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
      class="w-full rounded px-3 py-2 text-sm focus:outline-none"
      style="background: var(--surface-elevated); border: 1px solid var(--border-default); color: var(--text-primary)"
    />
    <div class="space-y-1 max-h-96 overflow-y-auto">
      <button
        v-for="result in graphStore.searchResults"
        :key="result.nodeId"
        @click="graphStore.selectNode(result.nodeId)"
        @dblclick="graphStore.focusNode(result.nodeId)"
        class="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors hover:bg-white/5"
      >
        <span
          class="w-2.5 h-2.5 rounded-full flex-shrink-0"
          :style="{ backgroundColor: NODE_COLORS[result.kind] }"
        ></span>
        <span class="text-sm truncate" style="color: var(--text-secondary)">{{ result.label }}</span>
        <span class="text-xs ml-auto" style="color: var(--text-tertiary)">{{ result.kind }}</span>
      </button>
    </div>
    <p v-if="query && graphStore.searchResults.length === 0" class="text-xs" style="color: var(--text-tertiary)">No results</p>
    <p v-if="!query" class="text-xs" style="color: var(--text-tertiary)">Click = select · Double-click = focus in tree</p>
  </div>
</template>
