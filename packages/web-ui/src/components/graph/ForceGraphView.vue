<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { useGraphStore } from '@/stores/graphStore';
import { useGraphClustering } from '@/composables/useGraphClustering';
import { NODE_STYLES, EDGE_STYLES } from '@/types/graph';

cytoscape.use(fcose);

const graphStore = useGraphStore();
const clustering = useGraphClustering();
const container = ref<HTMLElement>();
const tooltip = ref<{ show: boolean; x: number; y: number; text: string; kind: string; degree: number }>({
  show: false, x: 0, y: 0, text: '', kind: '', degree: 0,
});
let cy: cytoscape.Core | null = null;
const useClusters = ref(false);

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
    data: {
      id: e.id,
      source: e.source,
      target: e.target,
      kind: e.kind,
    },
  }));

  return [...nodes, ...edges];
}

function buildClusterElements() {
  if (!clustering.clusterData.value) return [];

  const elements: any[] = [];

  for (const cluster of clustering.clusterData.value.clusters) {
    if (clustering.isExpanded(cluster.id)) {
      const cached = clustering.expandedNodeCache.value.get(cluster.id);
      if (cached) {
        elements.push({
          data: { id: cluster.id, label: `${cluster.label} (${cluster.childCount})`, kind: 'cluster', isCluster: true },
        });
        for (const node of cached.nodes) {
          elements.push({ data: { id: node.id, label: node.label, kind: node.kind, parent: cluster.id } });
        }
        for (const edge of cached.edges) {
          elements.push({ data: { id: edge.id, source: edge.source, target: edge.target, kind: edge.kind } });
        }
      }
    } else {
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
    }
  }

  for (const edge of clustering.clusterData.value.edges) {
    const sourceExists = elements.some(e => e.data.id === edge.source);
    const targetExists = elements.some(e => e.data.id === edge.target);
    if (sourceExists && targetExists) {
      elements.push({
        data: { id: edge.id, source: edge.source, target: edge.target, kind: 'imports', weight: edge.weight },
      });
    }
  }

  return elements;
}

// ─── Stylesheet ───

function buildStylesheet(): any[] {
  // Node styles by kind — with shapes for colorblind support
  const nodeKindStyles = Object.entries(NODE_STYLES).map(([kind, style]) => ({
    selector: `node[kind = "${kind}"]`,
    style: {
      'background-color': style.color,
      'shape': style.shape,
    },
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
    // Base node — degree-based sizing
    {
      selector: 'node',
      style: {
        'background-color': '#666',
        'label': 'data(label)',
        'color': 'var(--text-secondary, #a0a8b8)',
        'text-outline-color': 'var(--surface-primary, #0f1219)',
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
    // Hover state
    {
      selector: 'node.hover',
      style: {
        'width': (ele: any) => Math.max(22, 16 + Math.sqrt(ele.degree() + 1) * 5) * 1.35,
        'height': (ele: any) => Math.max(22, 16 + Math.sqrt(ele.degree() + 1) * 5) * 1.35,
        'overlay-opacity': 0.1,
        'overlay-color': '#42b883',
        'z-index': 20,
        'font-size': '12px',
        'font-weight': 'bold',
        'color': '#fff',
      },
    },
    // Selected
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
    // Neighbor highlight
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 2,
        'border-color': '#f1c40f',
        'opacity': 1,
      },
    },
    {
      selector: 'node.faded',
      style: { 'opacity': 0.12 },
    },
    // Cluster node
    {
      selector: 'node[?isCluster]',
      style: {
        'shape': 'round-rectangle',
        'background-opacity': 0.2,
        'border-width': 2,
        'border-color': 'var(--border-default, #3a4050)',
        'padding': '20px',
        'font-size': '13px',
        'text-valign': 'top',
        'text-halign': 'center',
        'color': 'var(--text-secondary, #a0a8b8)',
      },
    },
    {
      selector: 'node[childCount]',
      style: {
        'width': (ele: any) => Math.min(60, 20 + Math.sqrt(ele.data('childCount')) * 5),
        'height': (ele: any) => Math.min(60, 20 + Math.sqrt(ele.data('childCount')) * 5),
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'shape': 'round-rectangle',
        'background-opacity': 0.7,
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
        'transition-property': 'opacity, width, line-color',
        'transition-duration': '200ms',
      },
    },
    {
      selector: 'edge.neighbor-highlight',
      style: {
        'opacity': 1,
        'width': 2.5,
        'z-index': 10,
      },
    },
    {
      selector: 'edge.highlighted',
      style: { 'width': 3, 'opacity': 1, 'z-index': 10 },
    },
    {
      selector: 'edge.faded',
      style: { 'opacity': 0.05 },
    },
    {
      selector: 'edge[weight]',
      style: {
        'width': (ele: any) => Math.min(6, 1 + Math.log2(ele.data('weight') || 1)),
      },
    },
    ...nodeKindStyles,
    ...edgeKindStyles,
  ];
}

// ─── Core Graph Functions ───

function initCytoscape() {
  if (!container.value) return;

  const elements = useClusters.value ? buildClusterElements() : buildElements();

  cy = cytoscape({
    container: container.value,
    elements,
    style: buildStylesheet(),
    layout: {
      name: 'fcose',
      animate: false,
      quality: 'default',
      nodeSeparation: 80,
      idealEdgeLength: 120,
      nodeRepulsion: () => 8000,
    } as any,
    minZoom: 0.05,
    maxZoom: 5,
    wheelSensitivity: 0.3,
  });

  // ─── Hover interaction ───
  cy.on('mouseover', 'node', (evt) => {
    const node = evt.target;
    if (node.data('isCluster') && !clustering.isExpanded(node.id())) {
      // Just show tooltip for clusters
    }
    node.addClass('hover');

    // Highlight neighborhood
    const neighborhood = node.closedNeighborhood();
    cy!.elements().not(neighborhood).addClass('faded');
    neighborhood.edges().addClass('neighbor-highlight');

    // Show tooltip
    const pos = node.renderedPosition();
    tooltip.value = {
      show: true,
      x: pos.x,
      y: pos.y - 20,
      text: node.data('fullLabel') || node.data('label'),
      kind: node.data('kind'),
      degree: node.degree(),
    };
  });

  cy.on('mouseout', 'node', (evt) => {
    evt.target.removeClass('hover');
    cy!.elements().removeClass('faded').removeClass('neighbor-highlight');
    tooltip.value.show = false;
  });

  // ─── Click interaction ───
  cy.on('tap', 'node', (evt) => {
    const data = evt.target.data();
    if (data.isCluster && !clustering.isExpanded(data.id)) return;
    graphStore.selectNode(data.id);
  });

  cy.on('dbltap', 'node[?isCluster]', async (evt) => {
    const clusterId = evt.target.id();
    if (clustering.isExpanded(clusterId)) {
      clustering.collapseCluster(clusterId);
    } else {
      await clustering.expandCluster(clusterId);
    }
    refreshGraph();
  });

  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      graphStore.selectNode(null);
      tooltip.value.show = false;
    }
  });

  // ─── LOD ───
  cy.on('zoom', () => updateLOD());
}

function updateLOD() {
  if (!cy) return;
  const zoom = cy.zoom();
  const labelOpacity = Math.min(1, Math.max(0, (zoom - 0.2) / 0.5));

  cy.batch(() => {
    if (zoom < 0.25) {
      cy!.nodes('[!isCluster]').style({ 'label': '', 'text-opacity': 0 });
      cy!.edges().style('opacity', 0.15);
    } else if (zoom < 0.6) {
      cy!.nodes('[!isCluster]').style({
        'label': (ele: any) => {
          const l = ele.data('label') || '';
          return l.length > 12 ? l.slice(0, 10) + '..' : l;
        },
        'text-opacity': labelOpacity,
      });
      cy!.edges().style('opacity', 0.4);
    } else {
      cy!.nodes('[!isCluster]').style({ 'label': 'data(label)', 'text-opacity': 1 });
      cy!.edges().style('opacity', 0.7);
    }
  });
}

function refreshGraph() {
  if (!cy) return;
  const elements = useClusters.value ? buildClusterElements() : buildElements();

  cy.batch(() => {
    cy!.elements().remove();
    cy!.add(elements);
  });

  cy.layout({
    name: 'fcose',
    animate: true,
    animationDuration: 400,
    animationEasing: 'ease-out',
    quality: 'default',
    nodeSeparation: 80,
    idealEdgeLength: 120,
  } as any).run();
}

function fitToView() {
  cy?.animate({ fit: { eles: cy.elements(), padding: 50 } } as any, { duration: 400, easing: 'ease-out-cubic' as any });
}

function focusNode(nodeId: string) {
  if (!cy) return;
  const node = cy.$id(nodeId);
  if (node.length) {
    cy.animate({ center: { eles: node }, zoom: 2 }, { duration: 400, easing: 'ease-out-cubic' as any });
  }
}

// ─── Watchers ───

watch(() => graphStore.filteredNodes.length + graphStore.filteredEdges.length, () => {
  if (!cy) return;
  const filteredCount = graphStore.filteredNodes.length;

  if (clustering.needsClustering(filteredCount) && !useClusters.value) {
    useClusters.value = true;
    clustering.fetchClustered(3).then(() => refreshGraph());
  } else if (useClusters.value && !clustering.needsClustering(filteredCount)) {
    useClusters.value = false;
    refreshGraph();
  } else {
    refreshGraph();
  }
});

watch(() => graphStore.selectedNodeId, (nodeId) => {
  if (nodeId) focusNode(nodeId);
});

onMounted(async () => {
  const filteredCount = graphStore.filteredNodes.length;
  if (clustering.needsClustering(filteredCount)) {
    useClusters.value = true;
    await clustering.fetchClustered(3);
  }
  await nextTick();
  if (graphStore.filteredNodes.length > 0 || clustering.clusterData.value) {
    initCytoscape();
  }
});

watch(() => graphStore.filteredNodes.length, (count) => {
  if (count > 0 && !cy) nextTick(initCytoscape);
});

onUnmounted(() => { cy?.destroy(); });

defineExpose({ fitToView, focusNode });
</script>

<template>
  <div class="relative w-full h-full">
    <div ref="container" class="w-full h-full" style="background: var(--surface-primary)"></div>

    <!-- Tooltip -->
    <Transition name="fade">
      <div
        v-if="tooltip.show"
        class="absolute pointer-events-none z-50 px-3 py-2 rounded-lg text-xs shadow-xl border"
        style="background: var(--surface-elevated); border-color: var(--border-subtle)"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', transform: 'translate(-50%, -100%)' }"
      >
        <div class="font-semibold" style="color: var(--text-primary)">{{ tooltip.text }}</div>
        <div class="flex items-center gap-2 mt-0.5" style="color: var(--text-tertiary)">
          <span>{{ tooltip.kind }}</span>
          <span>&middot;</span>
          <span>{{ tooltip.degree }} connections</span>
        </div>
      </div>
    </Transition>

    <!-- Cluster indicator -->
    <div
      v-if="useClusters"
      class="absolute top-3 left-3 rounded-lg px-3 py-2 text-xs border backdrop-blur-sm"
      style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-secondary)"
    >
      Clustered view ({{ clustering.clusterData.value?.clusters.length || 0 }} groups) · Double-click to expand
    </div>

    <!-- Controls -->
    <div class="absolute bottom-3 right-3 flex gap-1.5">
      <button
        @click="fitToView()"
        class="rounded-lg px-3 py-1.5 text-xs border backdrop-blur-sm transition-colors"
        style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-secondary)"
      >
        Fit
      </button>
      <button
        @click="useClusters = !useClusters; if (useClusters) { clustering.fetchClustered(3).then(() => refreshGraph()) } else { refreshGraph() }"
        class="rounded-lg px-3 py-1.5 text-xs border backdrop-blur-sm transition-colors"
        style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-secondary)"
      >
        {{ useClusters ? 'Expand All' : 'Cluster' }}
      </button>
    </div>
  </div>
</template>
