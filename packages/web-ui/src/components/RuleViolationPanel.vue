<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGraphStore } from '@/stores/graphStore';

const emit = defineEmits<{ close: [] }>();
const graphStore = useGraphStore();

interface RuleViolation {
  ruleId: string;
  ruleType: string;
  severity: 'error' | 'warning';
  message: string;
  nodeIds: string[];
  edgeIds: string[];
}

const violations = ref<RuleViolation[]>([]);
const loading = ref(false);

async function fetchViolations() {
  loading.value = true;
  try {
    const res = await fetch('/api/analysis/rule-violations');
    const data = await res.json();
    violations.value = data.violations || [];
  } catch {
    violations.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchViolations);

function severityColor(severity: string): string {
  return severity === 'error' ? '#ef4444' : '#f97316';
}

function navigateToNode(nodeId: string) {
  graphStore.focusNode(nodeId);
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
          <h2 class="text-sm font-semibold" style="color: var(--text-primary)">Rule Violations</h2>
          <span
            v-if="!loading"
            class="px-1.5 py-0.5 rounded text-xs font-medium"
            :style="{
              background: violations.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(66, 184, 131, 0.15)',
              color: violations.length > 0 ? '#ef4444' : '#42b883',
            }"
          >{{ violations.length }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="fetchViolations"
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
          Checking rules...
        </div>

        <div v-else-if="violations.length === 0" class="text-center py-8">
          <p class="text-sm" style="color: var(--text-secondary)">No rule violations found.</p>
          <p class="text-xs mt-1" style="color: var(--text-tertiary)">All architecture rules pass.</p>
        </div>

        <div v-else class="max-h-80 overflow-y-auto space-y-2">
          <div
            v-for="(v, i) in violations"
            :key="i"
            class="rounded-md px-3 py-2"
            style="background: var(--surface-primary); border: 1px solid var(--border-subtle)"
          >
            <div class="flex items-center gap-2 mb-1">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: severityColor(v.severity) }"
              ></span>
              <span class="text-xs font-medium" :style="{ color: severityColor(v.severity) }">{{ v.severity }}</span>
              <span class="text-xs font-mono" style="color: var(--text-tertiary)">[{{ v.ruleId }}]</span>
              <span class="text-xs" style="color: var(--text-tertiary)">{{ v.ruleType }}</span>
            </div>
            <p class="text-xs pl-4 mb-1" style="color: var(--text-secondary)">{{ v.message }}</p>
            <div v-if="v.nodeIds.length > 0" class="flex flex-wrap gap-1 pl-4">
              <button
                v-for="nid in v.nodeIds.slice(0, 5)"
                :key="nid"
                @click="navigateToNode(nid)"
                class="text-xs px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer"
                style="color: var(--accent-blue); border: 1px solid var(--border-subtle)"
              >{{ nid.split(':').pop() }}</button>
              <span v-if="v.nodeIds.length > 5" class="text-xs" style="color: var(--text-tertiary)">+{{ v.nodeIds.length - 5 }} more</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
