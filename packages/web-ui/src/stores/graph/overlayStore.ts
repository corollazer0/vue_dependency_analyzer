import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/api/client';

/**
 * Phase 2-8 (overlay slice).
 *
 * Owns all "highlight a subset of nodes" state: circular/orphan/hub
 * detection results, change-impact result sets, the path highlighted by
 * the Pathfinder, and the master toggle that decides whether overlays are
 * rendered at all.
 */
export const useGraphOverlayStore = defineStore('graph-overlay', () => {
  const circularNodeIds = ref<Set<string>>(new Set());
  const orphanNodeIds = ref<Set<string>>(new Set());
  const hubNodeIds = ref<Set<string>>(new Set());
  const showOverlays = ref(false);

  const highlightedPath = ref<string[]>([]);

  const impactNodeIds = ref<{ changed: Set<string>; direct: Set<string>; transitive: Set<string> }>({
    changed: new Set(),
    direct: new Set(),
    transitive: new Set(),
  });

  async function fetchOverlays(): Promise<void> {
    try {
      const res = await apiFetch('/api/analysis/overlays');
      const data = await res.json();
      circularNodeIds.value = new Set(data.circularNodeIds || []);
      orphanNodeIds.value = new Set(data.orphanNodeIds || []);
      hubNodeIds.value = new Set(data.hubNodeIds || []);
    } catch {
      // overlays are non-critical — silent failure preserves the rest of the UI
    }
  }

  return {
    circularNodeIds,
    orphanNodeIds,
    hubNodeIds,
    showOverlays,
    highlightedPath,
    impactNodeIds,
    fetchOverlays,
  };
});
