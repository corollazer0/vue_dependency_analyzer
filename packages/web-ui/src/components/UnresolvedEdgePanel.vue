<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGraphStore } from '@/stores/graphStore';

const emit = defineEmits<{ close: [] }>();
const graphStore = useGraphStore();

interface UnresolvedEdge {
  edgeId: string;
  sourceId: string;
  sourceLabel: string;
  sourceKind: string;
  edgeKind: string;
  target: string;
  prefix: string;
  importPath?: string;
}

const edges = ref<UnresolvedEdge[]>([]);
const loading = ref(false);

async function fetchEdges() {
  loading.value = true;
  try {
    const res = await fetch('/api/analysis/unresolved-edges');
    const data = await res.json();
    edges.value = data.edges || [];
  } catch {
    edges.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchEdges);

function prefixColor(prefix: string): string {
  switch (prefix) {
    case 'unresolved': return '#ef4444';
    case 'component': return '#3498db';
    case 'store': return '#ffd859';
    case 'composable': return '#a78bfa';
    default: return '#6b7280';
  }
}

function navigateToSource(sourceId: string) {
  graphStore.focusNode(sourceId);
  emit('close');
}
</script>

<template>
  <div
    class="absolute inset-0 z-30 flex items-start justify-center pt-16"
    style="background: var(--surface-overlay)"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"
      style="background: var(--surface-elevated); border: 1px solid var(--border-default)"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: var(--border-subtle)">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-semibold" style="color: var(--text-primary)">Unresolved Edges</h2>
          <span
            v-if="!loading"
            class="px-1.5 py-0.5 rounded text-xs font-medium"
            :style="{
              background: edges.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(66, 184, 131, 0.15)',
              color: edges.length > 0 ? '#ef4444' : '#42b883',
            }"
          >{{ edges.length }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="fetchEdges"
            class="px-2 py-1 text-xs rounded transition-colors hover:bg-white/5"
            style="color: var(--text-tertiary)"
          >Refresh</button>
          <button
            @click="emit('close')"
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            style="color: var(--text-tertiary)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="p-4">
        <div v-if="loading" class="flex items-center justify-center py-8 gap-2" style="color: var(--text-secondary)">
          <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          Loading...
        </div>

        <div v-else-if="edges.length === 0" class="text-center py-8">
          <p class="text-sm" style="color: var(--text-secondary)">All edges resolved successfully.</p>
        </div>

        <div v-else class="max-h-80 overflow-y-auto space-y-1.5">
          <div
            v-for="edge in edges"
            :key="edge.edgeId"
            class="rounded-md px-3 py-2"
            style="background: var(--surface-primary); border: 1px solid var(--border-subtle)"
          >
            <div class="flex items-center gap-2 text-xs">
              <button
                @click="navigateToSource(edge.sourceId)"
                class="font-medium truncate hover:underline cursor-pointer"
                style="color: var(--text-primary)"
                title="Navigate to source node"
              >{{ edge.sourceLabel }}</button>
              <span class="text-gray-500">{{ edge.edgeKind }}</span>
              <span style="color: var(--text-tertiary)">→</span>
              <span
                class="px-1.5 py-0.5 rounded font-mono"
                :style="{ color: prefixColor(edge.prefix), background: prefixColor(edge.prefix) + '15' }"
              >{{ edge.prefix }}</span>
              <span class="truncate" style="color: var(--text-secondary)">{{ edge.target.split(':').slice(1).join(':') }}</span>
            </div>
            <div v-if="edge.importPath" class="text-xs mt-0.5 pl-4" style="color: var(--text-tertiary)">
              import: {{ edge.importPath }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
