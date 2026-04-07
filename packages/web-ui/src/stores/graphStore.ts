import { defineStore } from 'pinia';
import { ref, shallowRef, computed, triggerRef } from 'vue';
import type { GraphData, GraphNode, GraphEdge, NodeKind, EdgeKind, SearchResult } from '@/types/graph';

export const useGraphStore = defineStore('graph', () => {
  const graphData = shallowRef<GraphData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedNodeId = ref<string | null>(null);
  const searchQuery = ref('');
  const searchResults = shallowRef<SearchResult[]>([]);

  // Filters — use regular refs since these are small sets
  const activeNodeKinds = ref<Set<NodeKind>>(new Set([
    'vue-component', 'vue-composable', 'pinia-store', 'vue-directive',
    'vue-router-route', 'ts-module', 'api-call-site',
    'spring-controller', 'spring-endpoint', 'spring-service',
    'native-bridge', 'native-method',
  ]));
  const activeEdgeKinds = ref<Set<EdgeKind>>(new Set([
    'imports', 'uses-component', 'uses-store', 'uses-composable',
    'uses-directive', 'provides', 'injects', 'api-call', 'api-serves',
    'native-call', 'route-renders', 'spring-injects',
  ]));

  // Debounce filter changes
  let filterDebounce: ReturnType<typeof setTimeout>;
  const _filteredNodes = shallowRef<GraphNode[]>([]);
  const _filteredEdges = shallowRef<GraphEdge[]>([]);

  function recomputeFiltered() {
    if (!graphData.value) {
      _filteredNodes.value = [];
      _filteredEdges.value = [];
      return;
    }

    const nodes = graphData.value.nodes.filter(n => activeNodeKinds.value.has(n.kind));
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = graphData.value.edges.filter(
      e => activeEdgeKinds.value.has(e.kind) && nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    _filteredNodes.value = nodes;
    _filteredEdges.value = edges;
    triggerRef(_filteredNodes);
    triggerRef(_filteredEdges);
  }

  const filteredNodes = computed(() => _filteredNodes.value);
  const filteredEdges = computed(() => _filteredEdges.value);

  const selectedNode = computed(() => {
    if (!selectedNodeId.value || !graphData.value) return null;
    return graphData.value.nodes.find(n => n.id === selectedNodeId.value) || null;
  });

  const selectedNodeEdges = computed(() => {
    if (!selectedNodeId.value || !graphData.value) return { incoming: [] as GraphEdge[], outgoing: [] as GraphEdge[] };
    return {
      incoming: graphData.value.edges.filter(e => e.target === selectedNodeId.value),
      outgoing: graphData.value.edges.filter(e => e.source === selectedNodeId.value),
    };
  });

  async function fetchGraph() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/graph');
      graphData.value = await res.json();
      triggerRef(graphData);
      recomputeFiltered();
    } catch (e) {
      error.value = `Failed to fetch graph: ${e}`;
    } finally {
      loading.value = false;
    }
  }

  async function search(query: string) {
    if (!query.trim()) {
      searchResults.value = [];
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      searchResults.value = data.results;
    } catch {
      searchResults.value = [];
    }
  }

  async function triggerReanalyze() {
    loading.value = true;
    try {
      await fetch('/api/analyze', { method: 'POST' });
      await fetchGraph();
    } finally {
      loading.value = false;
    }
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId;
  }

  function toggleNodeKind(kind: NodeKind) {
    if (activeNodeKinds.value.has(kind)) {
      activeNodeKinds.value.delete(kind);
    } else {
      activeNodeKinds.value.add(kind);
    }

    // Debounced recompute
    clearTimeout(filterDebounce);
    filterDebounce = setTimeout(recomputeFiltered, 150);
  }

  function toggleEdgeKind(kind: EdgeKind) {
    if (activeEdgeKinds.value.has(kind)) {
      activeEdgeKinds.value.delete(kind);
    } else {
      activeEdgeKinds.value.add(kind);
    }

    clearTimeout(filterDebounce);
    filterDebounce = setTimeout(recomputeFiltered, 150);
  }

  return {
    graphData,
    loading,
    error,
    selectedNodeId,
    selectedNode,
    selectedNodeEdges,
    searchQuery,
    searchResults,
    activeNodeKinds,
    activeEdgeKinds,
    filteredNodes,
    filteredEdges,
    fetchGraph,
    search,
    triggerReanalyze,
    selectNode,
    toggleNodeKind,
    toggleEdgeKind,
  };
});
