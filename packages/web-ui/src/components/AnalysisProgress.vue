<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  processed: number;
  total: number;
  currentFile: string;
  cachedCount: number;
  elapsedMs: number;
}>();

const emit = defineEmits<{
  cancel: [];
}>();

const percentage = computed(() =>
  props.total > 0 ? Math.round((props.processed / props.total) * 100) : 0
);

const elapsed = computed(() => (props.elapsedMs / 1000).toFixed(1));

const remaining = computed(() => {
  if (props.processed === 0) return '...';
  const avgMs = props.elapsedMs / props.processed;
  const remainingFiles = props.total - props.processed;
  return (remainingFiles * avgMs / 1000).toFixed(0);
});

const shortFile = computed(() => {
  const parts = props.currentFile.split('/');
  return parts.slice(-3).join('/');
});
</script>

<template>
  <div class="absolute inset-0 bg-gray-900/80 z-50 flex items-center justify-center">
    <div class="bg-gray-800 rounded-xl p-8 w-[480px] shadow-2xl border border-gray-700">
      <h2 class="text-xl font-bold text-white mb-4">Analyzing Project</h2>

      <!-- Progress Bar -->
      <div class="w-full bg-gray-700 rounded-full h-3 mb-3">
        <div
          class="bg-green-500 h-3 rounded-full transition-all duration-200"
          :style="{ width: `${percentage}%` }"
        ></div>
      </div>

      <!-- Stats -->
      <div class="flex justify-between text-sm text-gray-400 mb-4">
        <span>{{ processed }} / {{ total }} files ({{ percentage }}%)</span>
        <span v-if="cachedCount > 0" class="text-blue-400">{{ cachedCount }} cached</span>
      </div>

      <!-- Current File -->
      <div class="text-xs text-gray-500 truncate mb-4" :title="currentFile">
        {{ shortFile }}
      </div>

      <!-- Timing -->
      <div class="flex justify-between text-xs text-gray-500 mb-6">
        <span>Elapsed: {{ elapsed }}s</span>
        <span>Remaining: ~{{ remaining }}s</span>
      </div>

      <!-- Cancel -->
      <div class="flex justify-end">
        <button
          @click="emit('cancel')"
          class="px-4 py-1.5 rounded text-sm bg-gray-700 hover:bg-gray-600 text-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
