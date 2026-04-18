<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import cytoscapeSvg from 'cytoscape-svg';
// @ts-expect-error — cytoscape-canvas ships no types; the module is a function that takes `cytoscape`.
import cytoscapeCanvas from 'cytoscape-canvas';
import { useGraphStore } from '@/stores/graphStore';
import { useGraphClustering } from '@/composables/useGraphClustering';
import { NODE_STYLES, EDGE_STYLES } from '@/types/graph';

cytoscape.use(fcose);
cytoscape.use(cytoscapeSvg);
cytoscape.use(cytoscapeCanvas);

const graphStore = useGraphStore();
const clustering = useGraphClustering();
const container = ref<HTMLElement>();
const tooltip = ref<{ show: boolean; x: number; y: number; text: string; kind: string; degree: number }>({
  show: false, x: 0, y: 0, text: '', kind: '', degree: 0,
});
let cy: cytoscape.Core | null = null;
// Phase 1-7 — cytoscape-canvas overlay layer. Circular/orphan/hub rings are drawn
// on a dedicated canvas above the graph instead of toggling node classes (which
// forces Cytoscape style recomputation over potentially thousands of nodes every
// time the overlay set changes). Canvas redraws auto-sync with pan/zoom/layout.
let overlayLayer: { getCanvas: () => HTMLCanvasElement; clear: (ctx: CanvasRenderingContext2D) => void; setTransform: (ctx: CanvasRenderingContext2D) => void; resetTransform: (ctx: CanvasRenderingContext2D) => void } | null = null;
let overlayRedraw: (() => void) | null = null;
const useClusters = ref(false);
// Phase 3-3 — staged layout state. We track the active fcose run so a fresh
// pipeline (or unmount) can `.stop()` mid-iteration; without this, two overlapping
// layout requests would fight over node positions and never settle.
let activeLayout: cytoscape.Layouts | null = null;
let layoutGen = 0; // bumps on every cancel — stale stages compare against this and bail.

// ─── Element Builders ───

function buildElements() {
  const nodes = graphStore.filteredNodes.map(n => ({
    data: {
      id: n.id,
      label: n.label.length > 25 ? n.label.slice(0, 22) + '...' : n.label,
      fullLabel: n.label,
      kind: n.kind,
      filePath: n.filePath,
    },
  }));

  const edges = graphStore.filteredEdges.map(e => ({
    data: { id: e.id, source: e.source, target: e.target, kind: e.kind },
  }));

  return [...nodes, ...edges];
}

function buildClusterElements() {
  if (!clustering.clusterData.value) return [];

  const elements: any[] = [];
  const allNodeIds = new Set<string>();

  // First pass: collect all node IDs that will be in the graph
  for (const cluster of clustering.clusterData.value.clusters) {
    if (clustering.isExpanded(cluster.id)) {
      const cached = clustering.expandedNodeCache.value.get(cluster.id);
      if (cached) {
        allNodeIds.add(cluster.id);
        for (const node of cached.nodes) allNodeIds.add(node.id);
      }
    } else if (cluster.childCount > 0) {
      allNodeIds.add(cluster.id);
    } else {
      allNodeIds.add(cluster.id);
    }
  }

  // Second pass: build elements
  for (const cluster of clustering.clusterData.value.clusters) {
    if (clustering.isExpanded(cluster.id)) {
      const cached = clustering.expandedNodeCache.value.get(cluster.id);
      if (cached) {
        // Compound parent node
        elements.push({
          data: { id: cluster.id, label: `${cluster.label} (${cluster.childCount})`, kind: 'cluster', isCluster: true, isExpanded: true },
        });
        // Child nodes
        for (const node of cached.nodes) {
          elements.push({ data: { id: node.id, label: node.label, kind: node.kind, parent: cluster.id } });
        }
        // Only add edges where BOTH endpoints exist in our graph
        for (const edge of cached.edges) {
          if (allNodeIds.has(edge.source) && allNodeIds.has(edge.target)) {
            elements.push({ data: { id: edge.id, source: edge.source, target: edge.target, kind: edge.kind } });
          }
        }
      }
    } else if (cluster.childCount > 0) {
      const dominantKind = Object.entries(cluster.childKinds).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ts-module';
      elements.push({
        data: {
          id: cluster.id,
          label: `${cluster.label} (${cluster.childCount})`,
          kind: dominantKind,
          isCluster: true,
          childCount: cluster.childCount,
        },
      });
    } else {
      const kind = Object.keys(cluster.childKinds)[0] || 'ts-module';
      elements.push({ data: { id: cluster.id, label: cluster.label, kind } });
    }
  }

  // Inter-cluster edges — only if both endpoints exist
  for (const edge of clustering.clusterData.value.edges) {
    if (allNodeIds.has(edge.source) && allNodeIds.has(edge.target)) {
      elements.push({
        data: { id: edge.id, source: edge.source, target: edge.target, kind: edge.kinds?.[0] || 'imports', weight: edge.weight },
      });
    }
  }

  return elements;
}

// ─── Stylesheet ───

function buildStylesheet(): any[] {
  const nodeKindStyles = Object.entries(NODE_STYLES).map(([kind, style]) => ({
    selector: `node[kind = "${kind}"]`,
    style: { 'background-color': style.color, 'shape': style.shape },
  }));

  const edgeKindStyles = Object.entries(EDGE_STYLES).map(([kind, style]) => ({
    selector: `edge[kind = "${kind}"]`,
    style: {
      'line-color': style.color,
      'target-arrow-color': style.color,
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'width': 1.5,
      'arrow-scale': 0.7,
      ...(style.dashed ? { 'line-style': 'dashed' as const } : {}),
    },
  }));

  return [
    {
      selector: 'node',
      style: {
        'background-color': '#666',
        'label': 'data(label)',
        'color': '#a0a8b8',
        'text-outline-color': '#0f1219',
        'text-outline-width': 2,
        'font-size': '11px',
        'width': (ele: any) => Math.max(22, 16 + Math.sqrt(ele.degree() + 1) * 5),
        'height': (ele: any) => Math.max(22, 16 + Math.sqrt(ele.degree() + 1) * 5),
        'text-valign': 'bottom',
        'text-margin-y': 5,
        'min-zoomed-font-size': 8,
        'transition-property': 'width, height, opacity, overlay-opacity, border-width',
        'transition-duration': '200ms',
      },
    },
    {
      selector: 'node.hover',
      style: {
        'width': (ele: any) => Math.max(22, 16 + Math.sqrt(ele.degree() + 1) * 5) * 1.35,
        'height': (ele: any) => Math.max(22, 16 + Math.sqrt(ele.degree() + 1) * 5) * 1.35,
        'overlay-opacity': 0.1,
        'overlay-color': '#42b883',
        'z-index': 20,
        'font-size': '12px',
        'color': '#fff',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#42b883',
        'overlay-opacity': 0.12,
        'overlay-color': '#42b883',
        'z-index': 30,
      },
    },
    {
      selector: 'node.highlighted',
      style: { 'border-width': 2, 'border-color': '#f1c40f', 'opacity': 1 },
    },
    {
      selector: 'node.faded',
      style: { 'opacity': 0.12 },
    },
    // Cluster: collapsed
    {
      selector: 'node[?isCluster][childCount]',
      style: {
        'width': (ele: any) => Math.min(60, 20 + Math.sqrt(ele.data('childCount')) * 5),
        'height': (ele: any) => Math.min(60, 20 + Math.sqrt(ele.data('childCount')) * 5),
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'shape': 'round-rectangle',
        'background-opacity': 0.7,
        'border-width': 2,
        'border-color': '#3a4050',
        'cursor': 'pointer',
      },
    },
    // Cluster: expanded (compound parent)
    {
      selector: 'node[?isExpanded]',
      style: {
        'shape': 'round-rectangle',
        'background-opacity': 0.08,
        'border-width': 1,
        'border-color': '#3a4050',
        'border-style': 'dashed',
        'padding': '20px',
        'font-size': '13px',
        'text-valign': 'top',
        'text-halign': 'center',
        'color': '#6b7280',
      },
    },
    // Base edge
    {
      selector: 'edge',
      style: {
        'line-color': '#333',
        'target-arrow-color': '#333',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'width': 1,
        'arrow-scale': 0.6,
        'opacity': 0.6,
        'transition-property': 'opacity, width',
        'transition-duration': '200ms',
      },
    },
    {
      selector: 'edge.neighbor-highlight',
      style: { 'opacity': 1, 'width': 2.5, 'z-index': 10 },
    },
    {
      selector: 'edge.faded',
      style: { 'opacity': 0.05 },
    },
    {
      selector: 'edge[weight]',
      style: { 'width': (ele: any) => Math.min(6, 1 + Math.log2(ele.data('weight') || 1)) },
    },
    // Overlay styles — see Phase 1-7: rings now live on the cytoscape-canvas layer,
    // not on node classes. Kept empty intentionally so the selectors themselves are gone.
    // Path highlight styles (Pathfinder)
    {
      selector: 'node.path-highlight',
      style: { 'border-width': 3, 'border-color': '#3498db', 'opacity': 1, 'z-index': 25 },
    },
    {
      selector: 'edge.path-highlight',
      style: { 'line-color': '#3498db', 'target-arrow-color': '#3498db', 'width': 3, 'opacity': 1, 'z-index': 15 },
    },
    // Change impact styles
    {
      selector: 'node.impact-changed',
      style: { 'border-width': 4, 'border-color': '#ef4444', 'opacity': 1, 'z-index': 30 },
    },
    {
      selector: 'node.impact-direct',
      style: { 'border-width': 3, 'border-color': '#f97316', 'opacity': 1, 'z-index': 25 },
    },
    {
      selector: 'node.impact-transitive',
      style: { 'border-width': 2, 'border-color': '#eab308', 'opacity': 1, 'z-index': 20 },
    },
    ...nodeKindStyles,
    ...edgeKindStyles,
  ];
}

// ─── Core ───

function initCytoscape() {
  if (!container.value) return;
  const elements = useClusters.value ? buildClusterElements() : buildElements();

  cy = cytoscape({
    container: container.value,
    elements,
    style: buildStylesheet(),
    // Phase 3-3 — start with a no-op preset; the staged pipeline below seeds and
    // refines positions. Using a real fcose layout here would race the staged run.
    layout: { name: 'preset', fit: false } as any,
    minZoom: 0.05,
    maxZoom: 5,
    wheelSensitivity: 0.3,
  });
  void runStagedLayout({ preserve: false, fit: true });

  // Hover
  cy.on('mouseover', 'node', (evt) => {
    const node = evt.target;
    if (node.data('isExpanded')) return; // Don't hover on compound parents
    node.addClass('hover');
    const neighborhood = node.closedNeighborhood();
    // Fade everything except: neighborhood + compound parent nodes (isExpanded)
    const compoundParents = cy!.nodes('[?isExpanded]');
    cy!.elements().not(neighborhood).not(compoundParents).addClass('faded');
    neighborhood.edges().addClass('neighbor-highlight');
    const pos = node.renderedPosition();
    // Use original graph data for accurate connection count (Cytoscape degree is 0 in cluster mode)
    const nodeId = node.id();
    const realDegree = graphStore.graphData
      ? graphStore.graphData.edges.filter(e => e.source === nodeId || e.target === nodeId).length
      : node.degree();
    tooltip.value = { show: true, x: pos.x, y: pos.y - 20, text: node.data('fullLabel') || node.data('label'), kind: node.data('kind'), degree: realDegree };
  });

  cy.on('mouseout', 'node', (evt) => {
    evt.target.removeClass('hover');
    cy!.elements().removeClass('faded').removeClass('neighbor-highlight');
    tooltip.value.show = false;
  });

  // Phase 3-4 — single tap selects (uniform across clusters and regular nodes).
  // Expansion happens only on dbltap below — no scroll-based auto-expand exists
  // or will be added (FINAL-PLAN §0 explicitly forbids it).
  cy.on('tap', 'node', (evt) => {
    const data = evt.target.data();
    graphStore.selectNode(data.id);
    highlightNode(data.id);
  });

  cy.on('dbltap', 'node', async (evt) => {
    const data = evt.target.data();
    if (data.isCluster && data.childCount > 0 && !data.isExpanded) {
      await clustering.expandCluster(data.id);
      refreshGraph();
      return;
    }
    if (data.isExpanded) {
      clustering.collapseCluster(data.id);
      refreshGraph();
      return;
    }
    // Regular node dbltap → focus (centers + zooms). Distinguishes the
    // deliberate drill gesture from a casual click.
    graphStore.focusNode(data.id);
  });

  // Background click → deselect
  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      graphStore.selectNode(null);
      clearHighlights();
    }
  });

  cy.on('zoom', () => updateLOD());

  // Phase 5-2 harness hook. When the page was loaded with `?harness=1`, expose
  // the Cytoscape instance + a filter helper on `window.__vdaHarness` so a
  // Playwright bench script can measure G1 (first render) and G2 (filter repaint).
  // Guarded by URL param so production builds carry the check but no behavior.
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('harness')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.__vdaHarness = w.__vdaHarness ?? { firstPaintAt: null, renderCount: 0 };
    w.__vdaHarness.cy = cy;
    cy.on('render', () => {
      w.__vdaHarness.renderCount++;
      if (w.__vdaHarness.firstPaintAt === null) {
        w.__vdaHarness.firstPaintAt = performance.now();
      }
    });
    w.__vdaHarness.toggleFilter = (kind: string): Promise<number> => {
      return new Promise((resolve) => {
        const start = performance.now();
        cy!.one('render', () => resolve(performance.now() - start));
        graphStore.toggleNodeKind(kind);
      });
    };
  }

  // Overlay canvas layer — drawn above the graph, repainted automatically on pan/zoom/layout.
  overlayLayer = (cy as any).cyCanvas({ zIndex: 1 });
  overlayRedraw = () => {
    if (!cy || !overlayLayer) return;
    const canvas = overlayLayer.getCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    overlayLayer.resetTransform(ctx);
    overlayLayer.clear(ctx);
    if (!graphStore.showOverlays) return;
    overlayLayer.setTransform(ctx);
    cy.nodes().forEach((node: any) => {
      const id = node.id();
      const isCircular = graphStore.circularNodeIds.has(id);
      const isOrphan = graphStore.orphanNodeIds.has(id);
      const isHub = graphStore.hubNodeIds.has(id);
      if (!isCircular && !isOrphan && !isHub) return;
      const pos = node.position();
      const radius = Math.max(14, node.width() / 2 + 4);
      if (isCircular) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (isHub) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.fill();
      }
      if (isOrphan) {
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  };
  cy.on('render cyCanvas.resize', overlayRedraw);
  overlayRedraw();
}

function highlightNode(nodeId: string) {
  if (!cy) return;
  cy.batch(() => {
    cy!.elements().removeClass('faded').removeClass('neighbor-highlight').removeClass('highlighted');
    const node = cy!.$id(nodeId);
    if (!node.length) return;
    const neighborhood = node.closedNeighborhood();
    const compoundParents = cy!.nodes('[?isExpanded]');
    // Fade non-neighbors, but never compound parents
    cy!.elements().not(neighborhood).not(compoundParents).addClass('faded');
    neighborhood.edges().addClass('neighbor-highlight');
    node.addClass('highlighted');
  });
}

function clearHighlights() {
  if (!cy) return;
  cy.batch(() => {
    cy!.elements().removeClass('faded').removeClass('neighbor-highlight').removeClass('highlighted');
  });
  tooltip.value.show = false;
}

function updateLOD() {
  if (!cy) return;
  const zoom = cy.zoom();
  cy.batch(() => {
    if (zoom < 0.25) {
      cy!.nodes('[!isCluster][!isExpanded]').style({ 'label': '', 'text-opacity': 0 });
      cy!.edges().style('opacity', 0.15);
    } else if (zoom < 0.6) {
      cy!.nodes('[!isCluster][!isExpanded]').style({
        'label': (ele: any) => { const l = ele.data('label') || ''; return l.length > 12 ? l.slice(0, 10) + '..' : l; },
        'text-opacity': Math.min(1, (zoom - 0.2) / 0.4),
      });
      cy!.edges().style('opacity', 0.4);
    } else {
      cy!.nodes('[!isCluster][!isExpanded]').style({ 'label': 'data(label)', 'text-opacity': 1 });
      cy!.edges().style('opacity', 0.7);
    }
  });
}

function refreshGraph() {
  if (!cy) return;
  const elements = useClusters.value ? buildClusterElements() : buildElements();

  // Phase 1-4 — incremental diff instead of full remove+add. Preserves layout positions
  // for nodes that persist across a filter toggle (big UX win on large graphs) and skips
  // the fcose layout entirely if topology didn't change.
  const incomingById = new Map<string, any>();
  for (const el of elements) incomingById.set(el.data.id, el);

  const toRemove: cytoscape.CollectionReturnValue[] = [];
  cy.elements().forEach((el) => {
    if (!incomingById.has(el.id())) {
      toRemove.push(el as unknown as cytoscape.CollectionReturnValue);
    }
  });

  const existingIds = new Set<string>();
  cy.elements().forEach((el) => { existingIds.add(el.id()); });
  const toAdd: any[] = [];
  for (const [id, el] of incomingById) {
    if (!existingIds.has(id)) toAdd.push(el);
  }

  const topologyChanged = toRemove.length > 0 || toAdd.length > 0;

  cy.batch(() => {
    for (const el of toRemove) el.remove();
    if (toAdd.length) cy!.add(toAdd);
  });

  if (topologyChanged) {
    void runStagedLayout({ preserve: true, fit: false });
  }
  applyOverlays();
}

// Phase 3-3 — 3-stage layout pipeline.
//   Stage 1 (Spectral seed): fcose `quality: 'draft'` runs only the spectral
//     layout — gives us a structured initial placement in milliseconds.
//   Stage 2 (Coarse incremental): fcose `quality: 'proof'` with `randomize: false`
//     and a low `numIter` — refines on top of the seed without animating.
//   Stage 3 (Fine incremental): same but with full numIter and an animated
//     transition to the final position. The user sees the polished result.
// `preserve: true` skips the spectral seed so positions persist across filter
// changes (only the incremental refinements re-run). The whole pipeline is
// cancellable: every stage early-bails if `layoutGen` was bumped while it slept.
async function runStagedLayout(opts: { preserve: boolean; fit: boolean }): Promise<void> {
  if (!cy || cy.nodes().length === 0) return;
  cancelLayout();
  const myGen = ++layoutGen;

  if (!opts.preserve) {
    await runLayoutStage({
      name: 'fcose',
      quality: 'draft',
      randomize: true,
      animate: false,
      fit: false,
      nodeSeparation: 80,
      idealEdgeLength: 120,
    } as any, myGen);
    if (myGen !== layoutGen) return;
  }

  await runLayoutStage({
    name: 'fcose',
    quality: 'proof',
    randomize: false,
    animate: false,
    fit: false,
    nodeSeparation: 80,
    idealEdgeLength: 120,
    nodeRepulsion: () => 8000,
    numIter: 800,
    initialEnergyOnIncremental: 0.5,
  } as any, myGen);
  if (myGen !== layoutGen) return;

  await runLayoutStage({
    name: 'fcose',
    quality: 'proof',
    randomize: false,
    animate: 'end',
    animationDuration: 400,
    fit: opts.fit,
    nodeSeparation: 80,
    idealEdgeLength: 120,
    nodeRepulsion: () => 8000,
    numIter: 2500,
    initialEnergyOnIncremental: 0.3,
  } as any, myGen);
}

function runLayoutStage(options: cytoscape.LayoutOptions, gen: number): Promise<void> {
  return new Promise((resolve) => {
    if (!cy || gen !== layoutGen) { resolve(); return; }
    const layout = cy.layout(options);
    activeLayout = layout;
    layout.one('layoutstop', () => {
      if (activeLayout === layout) activeLayout = null;
      resolve();
    });
    layout.run();
  });
}

function cancelLayout(): void {
  layoutGen++;
  try { activeLayout?.stop(); } catch { /* layout already finished */ }
  activeLayout = null;
}

function fitToView() {
  cy?.animate({ fit: { eles: cy.elements(), padding: 50 } } as any, { duration: 400 });
}

function focusNode(nodeId: string) {
  if (!cy) return;
  const node = cy.$id(nodeId);
  if (node.length) cy.animate({ center: { eles: node }, zoom: 2 }, { duration: 400 });
}

// ─── Overlays ───
// Drawing lives on the cytoscape-canvas layer (Phase 1-7). These hooks just request
// a canvas redraw — no per-node style churn.

function applyOverlays() {
  overlayRedraw?.();
}

function removeOverlays() {
  overlayRedraw?.();
}

// ─── Watchers ───

watch(() => graphStore.filteredNodes.length + graphStore.filteredEdges.length, () => {
  if (!cy) return;
  const count = graphStore.filteredNodes.length;
  if (clustering.needsClustering(count) && !useClusters.value) {
    useClusters.value = true;
    clustering.fetchClustered(3).then(() => refreshGraph());
  } else if (useClusters.value && !clustering.needsClustering(count)) {
    useClusters.value = false;
    refreshGraph();
  } else {
    refreshGraph();
  }
});

watch(() => graphStore.selectedNodeId, (nodeId) => {
  if (nodeId) focusNode(nodeId);
});

watch(() => graphStore.showOverlays, (on) => {
  if (on) applyOverlays();
  else removeOverlays();
});

watch(() => graphStore.impactNodeIds, (impact) => {
  if (!cy) return;
  cy.elements().removeClass('impact-changed impact-direct impact-transitive');
  if (impact.changed.size > 0 || impact.direct.size > 0 || impact.transitive.size > 0) {
    cy.nodes().forEach((node: any) => {
      const id = node.id();
      if (impact.changed.has(id)) node.addClass('impact-changed');
      else if (impact.direct.has(id)) node.addClass('impact-direct');
      else if (impact.transitive.has(id)) node.addClass('impact-transitive');
    });
  }
}, { deep: true });

watch(() => graphStore.highlightedPath, (pathIds) => {
  if (!cy) return;
  // Clear previous path highlight
  cy.elements().removeClass('path-highlight');

  if (pathIds.length > 0) {
    const pathSet = new Set(pathIds);
    // Highlight path nodes
    cy.nodes().forEach((node: any) => {
      if (pathSet.has(node.id())) {
        node.addClass('path-highlight');
      }
    });
    // Highlight edges between consecutive path nodes
    for (let i = 0; i < pathIds.length - 1; i++) {
      const edge = cy.edges().filter((e: any) =>
        (e.source().id() === pathIds[i] && e.target().id() === pathIds[i + 1]) ||
        (e.source().id() === pathIds[i + 1] && e.target().id() === pathIds[i])
      );
      edge.addClass('path-highlight');
    }
    // Fade non-path elements
    cy.elements().not('.path-highlight').addClass('faded');
  } else {
    cy.elements().removeClass('faded');
  }
});

const onFitGraph = () => fitToView();
const onExportGraphPng = () => exportGraph('png');

onMounted(async () => {
  const count = graphStore.filteredNodes.length;
  if (clustering.needsClustering(count)) {
    useClusters.value = true;
    await clustering.fetchClustered(3);
  }
  await nextTick();
  if (graphStore.filteredNodes.length > 0 || clustering.clusterData.value) initCytoscape();

  // Listen for Command Palette events (cleaned up in onUnmounted)
  document.addEventListener('vda:fit-graph', onFitGraph);
  document.addEventListener('vda:export-graph-png', onExportGraphPng);
});

watch(() => graphStore.filteredNodes.length, (count) => {
  if (count > 0 && !cy) nextTick(initCytoscape);
});

function exportGraph(format: 'png' | 'svg') {
  if (!cy) return;
  if (format === 'png') {
    const dataUrl = cy.png({ full: true, scale: 2, bg: '#0f1219' });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'vda-graph.png';
    link.click();
  } else if (format === 'svg') {
    const svgData = (cy as any).svg({ full: true, scale: 2, bg: '#0f1219' });
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vda-graph.svg';
    link.click();
    URL.revokeObjectURL(url);
  }
}

onUnmounted(() => {
  document.removeEventListener('vda:fit-graph', onFitGraph);
  document.removeEventListener('vda:export-graph-png', onExportGraphPng);
  cancelLayout();
  cy?.destroy();
});
defineExpose({ fitToView, focusNode, exportGraph });
</script>

<template>
  <div class="relative w-full h-full">
    <div ref="container" class="w-full h-full" style="background: var(--surface-primary)"></div>

    <!-- Tooltip -->
    <Transition name="fade">
      <div v-if="tooltip.show" class="absolute pointer-events-none z-50 px-3 py-2 rounded-lg text-xs shadow-xl border"
        style="background: var(--surface-elevated); border-color: var(--border-subtle)"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', transform: 'translate(-50%, -100%)' }">
        <div class="font-semibold" style="color: var(--text-primary)">{{ tooltip.text }}</div>
        <div class="flex items-center gap-2 mt-0.5" style="color: var(--text-tertiary)">
          <span>{{ tooltip.kind }}</span><span>&middot;</span><span>{{ tooltip.degree }} connections</span>
        </div>
      </div>
    </Transition>

    <!-- Cluster indicator -->
    <div v-if="useClusters" class="absolute top-3 left-3 rounded-lg px-3 py-2 text-xs border backdrop-blur-sm"
      style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-secondary)">
      Clustered view · Double-click cluster to expand
    </div>

    <!-- Controls -->
    <div class="absolute bottom-3 right-3 flex gap-1.5">
      <button @click="graphStore.showOverlays = !graphStore.showOverlays"
        class="rounded-lg px-3 py-1.5 text-xs border backdrop-blur-sm"
        :style="{
          background: graphStore.showOverlays ? 'var(--accent-primary, #42b883)' : 'var(--surface-elevated)',
          borderColor: graphStore.showOverlays ? 'var(--accent-primary, #42b883)' : 'var(--border-subtle)',
          color: graphStore.showOverlays ? '#fff' : 'var(--text-secondary)',
        }">Overlays</button>
      <button @click="fitToView()" class="rounded-lg px-3 py-1.5 text-xs border backdrop-blur-sm" style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-secondary)">Fit</button>
      <button @click="useClusters = !useClusters; if (useClusters) { clustering.fetchClustered(3).then(() => refreshGraph()) } else { refreshGraph() }"
        class="rounded-lg px-3 py-1.5 text-xs border backdrop-blur-sm" style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-secondary)">
        {{ useClusters ? 'Expand All' : 'Cluster' }}
      </button>
      <button @click="exportGraph('png')" class="rounded-lg px-3 py-1.5 text-xs border backdrop-blur-sm" style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-secondary)">PNG</button>
      <button @click="exportGraph('svg')" class="rounded-lg px-3 py-1.5 text-xs border backdrop-blur-sm" style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-secondary)">SVG</button>
    </div>
  </div>
</template>
