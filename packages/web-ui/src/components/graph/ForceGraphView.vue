<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { useGraphStore } from '@/stores/graphStore';
import { useGraphClustering } from '@/composables/useGraphClustering';
import { NODE_COLORS, EDGE_STYLES } from '@/types/graph';

cytoscape.use(fcose);

const graphStore = useGraphStore();
const clustering = useGraphClustering();
const container = ref<HTMLElement>();
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
      // Show expanded children
      const cached = clustering.expandedNodeCache.value.get(cluster.id);
      if (cached) {
        // Compound parent
        elements.push({
          data: {
            id: cluster.id,
            label: `${cluster.label} (${cluster.childCount})`,
            kind: 'cluster',
            isCluster: true,
          },
        });
        for (const node of cached.nodes) {
          elements.push({
            data: {
              id: node.id,
              label: node.label,
              kind: node.kind,
              parent: cluster.id,
            },
          });
        }
        for (const edge of cached.edges) {
          elements.push({
            data: { id: edge.id, source: edge.source, target: edge.target, kind: edge.kind },
          });
        }
      }
    } else {
      // Collapsed cluster
      const dominantKind = Object.entries(cluster.childKinds)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'ts-module';
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

  // Inter-cluster edges
  for (const edge of clustering.clusterData.value.edges) {
    const sourceExists = elements.some(e => e.data.id === edge.source);
    const targetExists = elements.some(e => e.data.id === edge.target);
    if (sourceExists && targetExists) {
      elements.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          kind: 'imports',
          weight: edge.weight,
        },
      });
    }
  }

  return elements;
}

// ─── Stylesheet ───

function buildStylesheet(): any[] {
  const nodeStyles = Object.entries(NODE_COLORS).map(([kind, color]) => ({
    selector: `node[kind = "${kind}"]`,
    style: {
      'background-color': color,
      'label': 'data(label)',
      'color': '#fff',
      'text-outline-color': '#1a1a2e',
      'text-outline-width': 2,
      'font-size': '10px',
      'width': 24,
      'height': 24,
      'text-valign': 'bottom',
      'text-margin-y': 4,
    },
  }));

  const edgeStyles = Object.entries(EDGE_STYLES).map(([kind, style]) => ({
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
    // Base node
    {
      selector: 'node',
      style: {
        'background-color': '#666',
        'label': 'data(label)',
        'color': '#ccc',
        'text-outline-color': '#1a1a2e',
        'text-outline-width': 2,
        'font-size': '10px',
        'width': 24,
        'height': 24,
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'min-zoomed-font-size': 8,
      },
    },
    // Cluster (compound) node
    {
      selector: 'node[?isCluster]',
      style: {
        'shape': 'round-rectangle',
        'background-opacity': 0.15,
        'border-width': 2,
        'border-color': '#555',
        'padding': '20px',
        'font-size': '13px',
        'text-valign': 'top',
        'text-halign': 'center',
        'color': '#aaa',
      },
    },
    // Collapsed cluster with size indicator
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
    // Selected
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#fff',
      },
    },
    // Highlighted neighbors
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 2,
        'border-color': '#f1c40f',
      },
    },
    {
      selector: 'node.faded',
      style: { 'opacity': 0.12 },
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
      },
    },
    {
      selector: 'edge.highlighted',
      style: { 'width': 3, 'z-index': 10 },
    },
    {
      selector: 'edge.faded',
      style: { 'opacity': 0.08 },
    },
    // Weighted cluster edges
    {
      selector: 'edge[weight]',
      style: {
        'width': (ele: any) => Math.min(6, 1 + Math.log2(ele.data('weight') || 1)),
      },
    },
    ...nodeStyles,
    ...edgeStyles,
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

  // Node click
  cy.on('tap', 'node', (evt) => {
    const data = evt.target.data();
    if (data.isCluster && !clustering.isExpanded(data.id)) {
      // Double-click to expand
      return;
    }
    graphStore.selectNode(data.id);
    highlightConnected(data.id);
  });

  // Double-click cluster to expand
  cy.on('dbltap', 'node[?isCluster]', async (evt) => {
    const clusterId = evt.target.id();
    if (clustering.isExpanded(clusterId)) {
      clustering.collapseCluster(clusterId);
    } else {
      await clustering.expandCluster(clusterId);
    }
    refreshGraph();
  });

  // Background click
  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      graphStore.selectNode(null);
      clearHighlights();
    }
  });

  // LOD based on zoom
  cy.on('zoom', () => {
    updateLOD();
  });
}

function updateLOD() {
  if (!cy) return;
  const zoom = cy.zoom();

  cy.batch(() => {
    if (zoom < 0.3) {
      // Far zoom: hide labels on non-cluster nodes
      cy!.nodes('[!isCluster]').style('label', '');
      cy!.edges().style('opacity', 0.3);
    } else if (zoom < 0.7) {
      // Medium zoom: short labels
      cy!.nodes('[!isCluster]').style('label', (ele: any) => {
        const label = ele.data('label') || '';
        return label.length > 15 ? label.slice(0, 12) + '...' : label;
      });
      cy!.edges().style('opacity', 0.6);
    } else {
      // Close zoom: full labels
      cy!.nodes('[!isCluster]').style('label', 'data(label)');
      cy!.edges().style('opacity', 1);
    }
  });
}

function highlightConnected(nodeId: string) {
  if (!cy) return;
  cy.batch(() => {
    cy!.elements().addClass('faded');
    const node = cy!.$id(nodeId);
    const neighborhood = node.neighborhood().add(node);
    // 2nd degree neighbors
    const secondDegree = neighborhood.neighborhood().add(neighborhood);
    secondDegree.removeClass('faded');
    neighborhood.addClass('highlighted');
  });
}

function clearHighlights() {
  if (!cy) return;
  cy.batch(() => {
    cy!.elements().removeClass('faded').removeClass('highlighted');
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
    animationDuration: 300,
    quality: 'default',
    nodeSeparation: 80,
    idealEdgeLength: 120,
  } as any).run();
}

function fitToView() {
  cy?.fit(undefined, 50);
}

function focusNode(nodeId: string) {
  if (!cy) return;
  const node = cy.$id(nodeId);
  if (node.length) {
    cy.animate({ center: { eles: node }, zoom: 2 });
    highlightConnected(nodeId);
  }
}

// ─── Watchers ───

watch(() => graphStore.filteredNodes.length + graphStore.filteredEdges.length, () => {
  if (!cy) return;

  // Check if clustering is needed
  const totalNodes = graphStore.graphData?.nodes.length || 0;
  if (clustering.needsClustering(totalNodes) && !useClusters.value) {
    useClusters.value = true;
    clustering.fetchClustered().then(() => refreshGraph());
  } else {
    refreshGraph();
  }
});

watch(() => graphStore.selectedNodeId, (nodeId) => {
  if (nodeId) focusNode(nodeId);
  else clearHighlights();
});

onMounted(async () => {
  // Check if clustering is needed
  const totalNodes = graphStore.graphData?.nodes.length || 0;
  if (clustering.needsClustering(totalNodes)) {
    useClusters.value = true;
    await clustering.fetchClustered();
  }

  await nextTick();
  if (graphStore.filteredNodes.length > 0 || clustering.clusterData.value) {
    initCytoscape();
  }
});

watch(() => graphStore.filteredNodes.length, (count) => {
  if (count > 0 && !cy) {
    nextTick(initCytoscape);
  }
});

onUnmounted(() => {
  cy?.destroy();
});

defineExpose({ fitToView, focusNode });
</script>

<template>
  <div class="relative w-full h-full">
    <div ref="container" class="w-full h-full bg-gray-900"></div>

    <!-- Cluster mode indicator -->
    <div v-if="useClusters" class="absolute top-3 left-3 bg-gray-800/90 rounded px-3 py-1.5 text-xs text-gray-400 border border-gray-700">
      Clustered view ({{ clustering.clusterData.value?.clusters.length || 0 }} groups) · Double-click to expand
    </div>

    <!-- Controls -->
    <div class="absolute bottom-3 right-3 flex gap-1">
      <button @click="fitToView()" class="bg-gray-800/90 hover:bg-gray-700 rounded px-2 py-1 text-xs border border-gray-700">
        Fit
      </button>
      <button
        v-if="clustering.needsClustering(graphStore.graphData?.nodes.length || 0)"
        @click="useClusters = !useClusters; refreshGraph()"
        class="bg-gray-800/90 hover:bg-gray-700 rounded px-2 py-1 text-xs border border-gray-700"
      >
        {{ useClusters ? 'Expand All' : 'Cluster' }}
      </button>
    </div>
  </div>
</template>
