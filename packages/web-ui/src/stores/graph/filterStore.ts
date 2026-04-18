import { defineStore } from 'pinia';
import { ref, shallowRef, computed, triggerRef, watch } from 'vue';
import type { GraphNode, GraphEdge, NodeKind, EdgeKind } from '@/types/graph';
import { useGraphDataStore } from './dataStore';

const ALL_NODE_KINDS: NodeKind[] = [
  'vue-component', 'vue-composable', 'pinia-store', 'vue-directive',
  'vue-router-route', 'ts-module', 'api-call-site',
  'spring-controller', 'spring-endpoint', 'spring-service',
  'native-bridge', 'native-method',
  'mybatis-mapper', 'mybatis-statement', 'db-table',
  'vue-event', 'spring-event',
];

const ALL_EDGE_KINDS: EdgeKind[] = [
  'imports', 'uses-component', 'uses-store', 'uses-composable',
  'uses-directive', 'provides', 'injects', 'api-call', 'api-serves',
  'native-call', 'route-renders', 'spring-injects',
  'mybatis-maps', 'reads-table', 'writes-table', 'dto-flows',
  'emits-event', 'listens-event',
];

type FilterPreset = 'all' | 'none' | 'vue' | 'spring' | 'db' | 'api';

const FILTER_PRESETS: Record<FilterPreset, { nodes: NodeKind[]; edges: EdgeKind[] }> = {
  all: { nodes: ALL_NODE_KINDS, edges: ALL_EDGE_KINDS },
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

interface SavedPreset { nodes: NodeKind[]; edges: EdgeKind[] }

/**
 * Phase 2-8 (filter slice).
 *
 * Owns the active node/edge kind sets, derived filtered arrays, and preset
 * (built-in + user-saved) machinery. Auto-recomputes on graphData changes
 * via a watcher on the data slice. Toggles are debounced 150 ms to avoid
 * thrashing the cytoscape diff.
 */
export const useGraphFilterStore = defineStore('graph-filter', () => {
  const dataStore = useGraphDataStore();

  const activeNodeKinds = ref<Set<NodeKind>>(new Set(ALL_NODE_KINDS));
  const activeEdgeKinds = ref<Set<EdgeKind>>(new Set(ALL_EDGE_KINDS));

  const _filteredNodes = shallowRef<GraphNode[]>([]);
  const _filteredEdges = shallowRef<GraphEdge[]>([]);

  let filterDebounce: ReturnType<typeof setTimeout> | null = null;

  function recomputeFiltered(): void {
    const data = dataStore.graphData;
    if (!data) {
      _filteredNodes.value = [];
      _filteredEdges.value = [];
      return;
    }
    const nodes = data.nodes.filter((n) => activeNodeKinds.value.has(n.kind));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter(
      (e) => activeEdgeKinds.value.has(e.kind) && nodeIds.has(e.source) && nodeIds.has(e.target),
    );
    _filteredNodes.value = nodes;
    _filteredEdges.value = edges;
    triggerRef(_filteredNodes);
    triggerRef(_filteredEdges);
  }

  // Re-run filtering whenever the data slice swaps in a new graph.
  // No deep watch — graphData is a shallowRef, so identity comparison suffices.
  watch(() => dataStore.graphData, () => recomputeFiltered(), { flush: 'post' });

  const filteredNodes = computed(() => _filteredNodes.value);
  const filteredEdges = computed(() => _filteredEdges.value);

  function scheduleRecompute(): void {
    if (filterDebounce !== null) clearTimeout(filterDebounce);
    filterDebounce = setTimeout(() => {
      filterDebounce = null;
      recomputeFiltered();
    }, 150);
  }

  function toggleNodeKind(kind: NodeKind): void {
    if (activeNodeKinds.value.has(kind)) activeNodeKinds.value.delete(kind);
    else activeNodeKinds.value.add(kind);
    scheduleRecompute();
  }

  function toggleEdgeKind(kind: EdgeKind): void {
    if (activeEdgeKinds.value.has(kind)) activeEdgeKinds.value.delete(kind);
    else activeEdgeKinds.value.add(kind);
    scheduleRecompute();
  }

  function resetFilters(): void {
    activeNodeKinds.value = new Set(ALL_NODE_KINDS);
    activeEdgeKinds.value = new Set(ALL_EDGE_KINDS);
    recomputeFiltered();
  }

  function applyFilterPreset(preset: FilterPreset): void {
    const config = FILTER_PRESETS[preset];
    activeNodeKinds.value = new Set(config.nodes);
    activeEdgeKinds.value = new Set(config.edges);
    recomputeFiltered();
  }

  // --- User-saved presets (localStorage) ---
  const savedPresets = ref<Record<string, SavedPreset>>({});

  try {
    const raw = localStorage.getItem('vda-saved-presets');
    if (raw) savedPresets.value = JSON.parse(raw);
  } catch { /* ignore corrupt data */ }

  function persistSavedPresets(): void {
    localStorage.setItem('vda-saved-presets', JSON.stringify(savedPresets.value));
  }

  function saveCurrentAsPreset(name: string): void {
    if (!name.trim()) return;
    savedPresets.value[name.trim()] = {
      nodes: [...activeNodeKinds.value],
      edges: [...activeEdgeKinds.value],
    };
    persistSavedPresets();
  }

  function deleteSavedPreset(name: string): void {
    delete savedPresets.value[name];
    persistSavedPresets();
  }

  function applySavedPreset(name: string): void {
    const preset = savedPresets.value[name];
    if (!preset) return;
    activeNodeKinds.value = new Set(preset.nodes);
    activeEdgeKinds.value = new Set(preset.edges);
    recomputeFiltered();
  }

  return {
    activeNodeKinds,
    activeEdgeKinds,
    filteredNodes,
    filteredEdges,
    toggleNodeKind,
    toggleEdgeKind,
    resetFilters,
    applyFilterPreset,
    savedPresets,
    saveCurrentAsPreset,
    deleteSavedPreset,
    applySavedPreset,
    recomputeFiltered,
  };
});
