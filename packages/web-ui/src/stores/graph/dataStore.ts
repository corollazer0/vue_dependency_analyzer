import { defineStore } from 'pinia';
import { ref, shallowRef, triggerRef } from 'vue';
import type { GraphData } from '@/types/graph';
import { apiFetch } from '@/api/client';

/**
 * Phase 2-8 (data slice).
 *
 * Owns the raw graph payload + load lifecycle. Intentionally minimal so
 * fetches don't block on overlay/filter recomputation; consumers that need
 * those derived states wire watchers on `graphData` from their own slice.
 */
export const useGraphDataStore = defineStore('graph-data', () => {
  const graphData = shallowRef<GraphData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchGraph(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const res = await apiFetch('/api/graph');
      graphData.value = await res.json();
      triggerRef(graphData);
    } catch (e) {
      error.value = `Failed to fetch graph: ${e}`;
    } finally {
      loading.value = false;
    }
  }

  async function triggerReanalyze(): Promise<void> {
    loading.value = true;
    try {
      await apiFetch('/api/analyze', { method: 'POST' });
      await fetchGraph();
    } finally {
      loading.value = false;
    }
  }

  return { graphData, loading, error, fetchGraph, triggerReanalyze };
});
