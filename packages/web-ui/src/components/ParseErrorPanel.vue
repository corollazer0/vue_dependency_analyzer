<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGraphStore } from '@/stores/graphStore';

const emit = defineEmits<{ close: [] }>();
const graphStore = useGraphStore();

interface ParseError {
  filePath: string;
  message: string;
  line: number;
  severity: string;
}

const errors = ref<ParseError[]>([]);
const loading = ref(false);

async function fetchErrors() {
  loading.value = true;
  try {
    const res = await fetch('/api/analysis/parse-errors');
    const data = await res.json();
    errors.value = data.errors || [];
  } catch {
    errors.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchErrors);

function severityColor(severity: string): string {
  switch (severity) {
    case 'error': return 'var(--accent-danger)';
    case 'warning': return 'var(--accent-warning)';
    default: return 'var(--text-tertiary)';
  }
}

function navigateToError(err: ParseError) {
  if (!graphStore.graphData) return;
  const node = graphStore.graphData.nodes.find(
    n => n.filePath === err.filePath || n.filePath.endsWith(err.filePath)
  );
  if (node) {
    graphStore.focusNode(node.id);
    emit('close');
  }
}
</script>

<template>
  <div
    class="absolute inset-0 z-30 flex items-start justify-center pt-16"
    style="background: var(--surface-overlay)"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-xl rounded-lg shadow-2xl overflow-hidden"
      style="background: var(--surface-elevated); border: 1px solid var(--border-default)"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: var(--border-subtle)">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-semibold" style="color: var(--text-primary)">Parse Errors</h2>
          <span
            v-if="!loading"
            class="px-1.5 py-0.5 rounded text-xs font-medium"
            :style="{
              background: errors.length > 0 ? 'var(--accent-danger)' : 'var(--accent-vue)',
              color: '#fff',
            }"
          >{{ errors.length }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="fetchErrors"
            class="px-2 py-1 text-xs rounded transition-colors hover:bg-white/5"
            style="color: var(--text-tertiary)"
            title="Refresh"
          >Refresh</button>
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
      <div class="p-4">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-8 gap-2" style="color: var(--text-secondary)">
          <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          Loading...
        </div>

        <!-- Empty -->
        <div v-else-if="errors.length === 0" class="text-center py-8">
          <p class="text-sm" style="color: var(--text-secondary)">No parse errors found.</p>
          <p class="text-xs mt-1" style="color: var(--text-tertiary)">All files parsed successfully.</p>
        </div>

        <!-- Error list -->
        <div v-else class="max-h-80 overflow-y-auto space-y-2">
          <div
            v-for="(err, i) in errors"
            :key="i"
            class="rounded-md px-3 py-2"
            style="background: var(--surface-primary); border: 1px solid var(--border-subtle)"
          >
            <div class="flex items-center gap-2 mb-1">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: severityColor(err.severity) }"
              ></span>
              <button
                @click="navigateToError(err)"
                class="text-xs font-medium truncate hover:underline cursor-pointer"
                style="color: var(--text-primary)"
                title="Navigate to node"
              >{{ err.filePath }}</button>
              <span v-if="err.line" class="text-xs flex-shrink-0" style="color: var(--text-tertiary)">:{{ err.line }}</span>
              <span
                class="text-xs ml-auto flex-shrink-0 px-1.5 py-0.5 rounded"
                :style="{ color: severityColor(err.severity) }"
              >{{ err.severity }}</span>
            </div>
            <p class="text-xs pl-4" style="color: var(--text-secondary)">{{ err.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
