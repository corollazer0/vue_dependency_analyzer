import { defineStore, storeToRefs } from 'pinia';
import { useGraphDataStore } from './graph/dataStore';
import { useGraphFilterStore } from './graph/filterStore';
import { useGraphInteractionStore } from './graph/interactionStore';
import { useGraphOverlayStore } from './graph/overlayStore';

/**
 * Phase 2-8 façade.
 *
 * The monolithic `useGraphStore` was split into four slices —
 *   - graph-data (dataStore.ts):        graphData, loading, error, fetch*
 *   - graph-filter (filterStore.ts):    activeNodeKinds, presets, filtered*
 *   - graph-interaction (...):          selection, focus, nav history, search
 *   - graph-overlay (...):              circular/orphan/hub, impact, overlays
 *
 * This file re-exports every legacy field/action from the four sub-stores
 * so existing components keep importing `useGraphStore` unchanged.
 *
 * Re-exporting refs through Pinia is direct: each sub-store is itself a
 * reactive proxy; assigning sub.x to the façade's return preserves
 * `.value` access in setup() and template auto-unwrapping.
 *
 * Two cross-slice behaviors that the monolith handled inline:
 *   - fetchOverlays after fetchGraph → composed in the façade's fetchGraph
 *   - filter recompute after fetchGraph → handled by a watcher inside
 *     filterStore (no façade work needed)
 */
export const useGraphStore = defineStore('graph', () => {
  const data = useGraphDataStore();
  const filter = useGraphFilterStore();
  const interaction = useGraphInteractionStore();
  const overlay = useGraphOverlayStore();

  // Pinia auto-unwraps refs at property access on a store instance, so
  // `data.graphData` here is the *current value*, not the live ref. Feeding
  // those values into the facade's return literal would freeze them at
  // facade-init time (graphData: null). `storeToRefs` pulls the live refs
  // out so the facade stays reactive across sub-stores.
  const dataRefs = storeToRefs(data);
  const filterRefs = storeToRefs(filter);
  const interactionRefs = storeToRefs(interaction);
  const overlayRefs = storeToRefs(overlay);

  // Compose the post-fetch overlay fetch the original store did inline.
  async function fetchGraph(): Promise<void> {
    await data.fetchGraph();
    overlay.fetchOverlays();
  }

  async function triggerReanalyze(): Promise<void> {
    await data.triggerReanalyze();
    // data.triggerReanalyze() calls fetchGraph internally on the data slice,
    // but that path skips the overlay refresh — pull overlays explicitly here
    // so the consumer-facing contract matches the pre-split behavior.
    overlay.fetchOverlays();
  }

  return {
    // ── data slice ──
    graphData: dataRefs.graphData,
    loading: dataRefs.loading,
    error: dataRefs.error,
    fetchGraph,
    triggerReanalyze,

    // ── filter slice ──
    activeNodeKinds: filterRefs.activeNodeKinds,
    activeEdgeKinds: filterRefs.activeEdgeKinds,
    filteredNodes: filterRefs.filteredNodes,
    filteredEdges: filterRefs.filteredEdges,
    toggleNodeKind: filter.toggleNodeKind,
    toggleEdgeKind: filter.toggleEdgeKind,
    resetFilters: filter.resetFilters,
    applyFilterPreset: filter.applyFilterPreset,
    savedPresets: filterRefs.savedPresets,
    saveCurrentAsPreset: filter.saveCurrentAsPreset,
    deleteSavedPreset: filter.deleteSavedPreset,
    applySavedPreset: filter.applySavedPreset,

    // ── interaction slice ──
    selectedNodeId: interactionRefs.selectedNodeId,
    focusNodeId: interactionRefs.focusNodeId,
    selectedNode: interactionRefs.selectedNode,
    selectedNodeEdges: interactionRefs.selectedNodeEdges,
    searchQuery: interactionRefs.searchQuery,
    searchResults: interactionRefs.searchResults,
    selectNode: interaction.selectNode,
    focusNode: interaction.focusNode,
    navBack: interaction.navBack,
    navForward: interaction.navForward,
    canNavBack: interactionRefs.canNavBack,
    canNavForward: interactionRefs.canNavForward,
    search: interaction.search,

    // ── overlay slice ──
    circularNodeIds: overlayRefs.circularNodeIds,
    orphanNodeIds: overlayRefs.orphanNodeIds,
    hubNodeIds: overlayRefs.hubNodeIds,
    showOverlays: overlayRefs.showOverlays,
    highlightedPath: overlayRefs.highlightedPath,
    impactNodeIds: overlayRefs.impactNodeIds,
    fetchOverlays: overlay.fetchOverlays,
  };
});
