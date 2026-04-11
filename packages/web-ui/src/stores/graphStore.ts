import { defineStore } from 'pinia';
import { ref, shallowRef, computed, triggerRef } from 'vue';
import type { GraphData, GraphNode, GraphEdge, NodeKind, EdgeKind, SearchResult } from '@/types/graph';
import { apiFetch } from '@/api/client';

export const useGraphStore = defineStore('graph', () => {
  const graphData = shallowRef<GraphData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedNodeId = ref<string | null>(null);
  const searchQuery = ref('');
  const searchResults = shallowRef<SearchResult[]>([]);

  // Overlay state (circular / orphan / hub highlighting)
  const circularNodeIds = ref<Set<string>>(new Set());
  const orphanNodeIds = ref<Set<string>>(new Set());
  const hubNodeIds = ref<Set<string>>(new Set());
  const showOverlays = ref(false);

  // Filters — use regular refs since these are small sets
  const activeNodeKinds = ref<Set<NodeKind>>(new Set([
    'vue-component', 'vue-composable', 'pinia-store', 'vue-directive',
    'vue-router-route', 'ts-module', 'api-call-site',
    'spring-controller', 'spring-endpoint', 'spring-service',
    'native-bridge', 'native-method',
    'mybatis-mapper', 'mybatis-statement', 'db-table',
    'vue-event', 'spring-event',
  ]));
  const activeEdgeKinds = ref<Set<EdgeKind>>(new Set([
    'imports', 'uses-component', 'uses-store', 'uses-composable',
    'uses-directive', 'provides', 'injects', 'api-call', 'api-serves',
    'native-call', 'route-renders', 'spring-injects',
    'mybatis-maps', 'reads-table', 'writes-table', 'dto-flows',
    'emits-event', 'listens-event',
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

  async function fetchOverlays() {
    try {
      const res = await apiFetch('/api/analysis/overlays');
      const data = await res.json();
      circularNodeIds.value = new Set(data.circularNodeIds || []);
      orphanNodeIds.value = new Set(data.orphanNodeIds || []);
      hubNodeIds.value = new Set(data.hubNodeIds || []);
    } catch {
      // silently ignore — overlays are non-critical
    }
  }

  async function fetchGraph() {
    loading.value = true;
    error.value = null;
    try {
      const res = await apiFetch('/api/graph');
      graphData.value = await res.json();
      triggerRef(graphData);
      recomputeFiltered();
      fetchOverlays();
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
      const res = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      searchResults.value = data.results;
    } catch {
      searchResults.value = [];
    }
  }

  async function triggerReanalyze() {
    loading.value = true;
    try {
      await apiFetch('/api/analyze', { method: 'POST' });
      await fetchGraph();
    } finally {
      loading.value = false;
    }
  }

  // Path highlight for Pathfinder
  const highlightedPath = ref<string[]>([]);

  // Change impact overlay
  const impactNodeIds = ref<{ changed: Set<string>; direct: Set<string>; transitive: Set<string> }>({
    changed: new Set(), direct: new Set(), transitive: new Set(),
  });

  // focusNodeId: set by double-click from Search or Tree to re-root the tree view
  const focusNodeId = ref<string | null>(null);

  // Navigation history (back/forward)
  const navHistory = ref<string[]>([]);
  const navIndex = ref(-1);
  let navLock = false; // prevent history push during back/forward

  function selectNode(nodeId: string | null) {
    if (nodeId && !navLock && nodeId !== selectedNodeId.value) {
      // Trim forward history and push
      navHistory.value = navHistory.value.slice(0, navIndex.value + 1);
      navHistory.value.push(nodeId);
      navIndex.value = navHistory.value.length - 1;
    }
    selectedNodeId.value = nodeId;
  }

  function focusNode(nodeId: string) {
    selectNode(nodeId);
    focusNodeId.value = nodeId;
  }

  function navBack() {
    if (navIndex.value > 0) {
      navIndex.value--;
      navLock = true;
      selectedNodeId.value = navHistory.value[navIndex.value];
      navLock = false;
    }
  }

  function navForward() {
    if (navIndex.value < navHistory.value.length - 1) {
      navIndex.value++;
      navLock = true;
      selectedNodeId.value = navHistory.value[navIndex.value];
      navLock = false;
    }
  }

  const canNavBack = computed(() => navIndex.value > 0);
  const canNavForward = computed(() => navIndex.value < navHistory.value.length - 1);

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

  function resetFilters() {
    activeNodeKinds.value = new Set([
      'vue-component', 'vue-composable', 'pinia-store', 'vue-directive',
      'vue-router-route', 'ts-module', 'api-call-site',
      'spring-controller', 'spring-endpoint', 'spring-service',
      'native-bridge', 'native-method',
      'mybatis-mapper', 'mybatis-statement', 'db-table',
      'vue-event', 'spring-event',
    ]);
    activeEdgeKinds.value = new Set([
      'imports', 'uses-component', 'uses-store', 'uses-composable',
      'uses-directive', 'provides', 'injects', 'api-call', 'api-serves',
      'native-call', 'route-renders', 'spring-injects',
      'mybatis-maps', 'reads-table', 'writes-table', 'dto-flows',
      'emits-event', 'listens-event',
    ]);
    recomputeFiltered();
  }

  type FilterPreset = 'all' | 'none' | 'vue' | 'spring' | 'db' | 'api';

  const FILTER_PRESETS: Record<FilterPreset, { nodes: NodeKind[]; edges: EdgeKind[] }> = {
    all: {
      nodes: [
        'vue-component', 'vue-composable', 'pinia-store', 'vue-directive',
        'vue-router-route', 'ts-module', 'api-call-site',
        'spring-controller', 'spring-endpoint', 'spring-service',
        'native-bridge', 'native-method',
        'mybatis-mapper', 'mybatis-statement', 'db-table',
        'vue-event', 'spring-event',
      ],
      edges: [
        'imports', 'uses-component', 'uses-store', 'uses-composable',
        'uses-directive', 'provides', 'injects', 'api-call', 'api-serves',
        'native-call', 'route-renders', 'spring-injects',
        'mybatis-maps', 'reads-table', 'writes-table', 'dto-flows',
        'emits-event', 'listens-event',
      ],
    },
    none: { nodes: [], edges: [] },
    vue: {
      nodes: ['vue-component', 'vue-composable', 'pinia-store', 'vue-directive', 'vue-router-route', 'ts-module', 'vue-event'],
      edges: ['imports', 'uses-component', 'uses-store', 'uses-composable', 'uses-directive', 'provides', 'injects', 'route-renders', 'emits-event', 'listens-event'],
    },
    spring: {
      nodes: ['spring-controller', 'spring-endpoint', 'spring-service', 'spring-event'],
      edges: ['spring-injects', 'api-serves', 'emits-event', 'listens-event'],
    },
    db: {
      nodes: ['mybatis-mapper', 'mybatis-statement', 'db-table'],
      edges: ['mybatis-maps', 'reads-table', 'writes-table'],
    },
    api: {
      nodes: ['api-call-site', 'spring-endpoint', 'vue-component'],
      edges: ['api-call', 'api-serves'],
    },
  };

  function applyFilterPreset(preset: FilterPreset) {
    const config = FILTER_PRESETS[preset];
    activeNodeKinds.value = new Set(config.nodes);
    activeEdgeKinds.value = new Set(config.edges);
    recomputeFiltered();
  }

  // --- User-saved presets (localStorage) ---
  interface SavedPreset { nodes: NodeKind[]; edges: EdgeKind[] }
  const savedPresets = ref<Record<string, SavedPreset>>({});

  // Load from localStorage on init
  try {
    const raw = localStorage.getItem('vda-saved-presets');
    if (raw) savedPresets.value = JSON.parse(raw);
  } catch { /* ignore corrupt data */ }

  function persistSavedPresets() {
    localStorage.setItem('vda-saved-presets', JSON.stringify(savedPresets.value));
  }

  function saveCurrentAsPreset(name: string) {
    if (!name.trim()) return;
    savedPresets.value[name.trim()] = {
      nodes: [...activeNodeKinds.value],
      edges: [...activeEdgeKinds.value],
    };
    persistSavedPresets();
  }

  function deleteSavedPreset(name: string) {
    delete savedPresets.value[name];
    persistSavedPresets();
  }

  function applySavedPreset(name: string) {
    const preset = savedPresets.value[name];
    if (!preset) return;
    activeNodeKinds.value = new Set(preset.nodes);
    activeEdgeKinds.value = new Set(preset.edges);
    recomputeFiltered();
  }

  return {
    graphData,
    loading,
    error,
    selectedNodeId,
    focusNodeId,
    selectedNode,
    selectedNodeEdges,
    searchQuery,
    searchResults,
    activeNodeKinds,
    activeEdgeKinds,
    filteredNodes,
    filteredEdges,
    circularNodeIds,
    orphanNodeIds,
    hubNodeIds,
    showOverlays,
    highlightedPath,
    impactNodeIds,
    fetchGraph,
    fetchOverlays,
    search,
    triggerReanalyze,
    selectNode,
    focusNode,
    navBack,
    navForward,
    canNavBack,
    canNavForward,
    toggleNodeKind,
    toggleEdgeKind,
    resetFilters,
    applyFilterPreset,
    savedPresets,
    saveCurrentAsPreset,
    deleteSavedPreset,
    applySavedPreset,
  };
});
