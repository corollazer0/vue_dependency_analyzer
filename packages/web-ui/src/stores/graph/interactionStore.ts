import { defineStore } from 'pinia';
import { ref, shallowRef, computed } from 'vue';
import type { GraphEdge, SearchResult } from '@/types/graph';
import { apiFetch } from '@/api/client';
import { useGraphDataStore } from './dataStore';

/**
 * Phase 2-8 (interaction slice).
 *
 * Owns user-facing selection: currently selected node, focus target (for
 * tree drill-down), navigation history (back/forward), and search query +
 * results. selectedNode/selectedNodeEdges are derived from the data slice.
 */
export const useGraphInteractionStore = defineStore('graph-interaction', () => {
  const dataStore = useGraphDataStore();

  const selectedNodeId = ref<string | null>(null);
  const focusNodeId = ref<string | null>(null);

  const searchQuery = ref('');
  const searchResults = shallowRef<SearchResult[]>([]);

  const navHistory = ref<string[]>([]);
  const navIndex = ref(-1);
  let navLock = false;

  const selectedNode = computed(() => {
    if (!selectedNodeId.value || !dataStore.graphData) return null;
    return dataStore.graphData.nodes.find((n) => n.id === selectedNodeId.value) || null;
  });

  const selectedNodeEdges = computed(() => {
    if (!selectedNodeId.value || !dataStore.graphData) {
      return { incoming: [] as GraphEdge[], outgoing: [] as GraphEdge[] };
    }
    return {
      incoming: dataStore.graphData.edges.filter((e) => e.target === selectedNodeId.value),
      outgoing: dataStore.graphData.edges.filter((e) => e.source === selectedNodeId.value),
    };
  });

  function selectNode(nodeId: string | null): void {
    if (nodeId && !navLock && nodeId !== selectedNodeId.value) {
      navHistory.value = navHistory.value.slice(0, navIndex.value + 1);
      navHistory.value.push(nodeId);
      navIndex.value = navHistory.value.length - 1;
    }
    selectedNodeId.value = nodeId;
  }

  function focusNode(nodeId: string): void {
    selectNode(nodeId);
    focusNodeId.value = nodeId;
  }

  function navBack(): void {
    if (navIndex.value > 0) {
      navIndex.value--;
      navLock = true;
      selectedNodeId.value = navHistory.value[navIndex.value];
      navLock = false;
    }
  }

  function navForward(): void {
    if (navIndex.value < navHistory.value.length - 1) {
      navIndex.value++;
      navLock = true;
      selectedNodeId.value = navHistory.value[navIndex.value];
      navLock = false;
    }
  }

  const canNavBack = computed(() => navIndex.value > 0);
  const canNavForward = computed(() => navIndex.value < navHistory.value.length - 1);

  async function search(query: string): Promise<void> {
    if (!query.trim()) {
      searchResults.value = [];
      return;
    }
    try {
      const res = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      searchResults.value = data.results;
    } catch {
      searchResults.value = [];
    }
  }

  return {
    selectedNodeId,
    focusNodeId,
    selectedNode,
    selectedNodeEdges,
    searchQuery,
    searchResults,
    selectNode,
    focusNode,
    navBack,
    navForward,
    canNavBack,
    canNavForward,
    search,
  };
});
