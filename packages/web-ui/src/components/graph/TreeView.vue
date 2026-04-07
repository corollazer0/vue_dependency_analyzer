<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Selection from 'd3-selection';
import * as d3Zoom from 'd3-zoom';
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS } from '@/types/graph';
import type { GraphNode, GraphEdge } from '@/types/graph';

const graphStore = useGraphStore();
const svgRef = ref<SVGSVGElement>();
const direction = ref<'dependencies' | 'dependents'>('dependencies');

interface TreeNode {
  id: string;
  label: string;
  kind: string;
  children: TreeNode[];
}

function buildTree(rootId: string, dir: 'dependencies' | 'dependents', maxDepth = 5): TreeNode {
  const nodes = graphStore.filteredNodes;
  const edges = graphStore.filteredEdges;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();

  function traverse(nodeId: string, depth: number): TreeNode {
    const node = nodeMap.get(nodeId);
    visited.add(nodeId);

    const children: TreeNode[] = [];
    if (depth < maxDepth) {
      const connectedEdges = dir === 'dependencies'
        ? edges.filter(e => e.source === nodeId)
        : edges.filter(e => e.target === nodeId);

      for (const edge of connectedEdges) {
        const nextId = dir === 'dependencies' ? edge.target : edge.source;
        if (!visited.has(nextId) && nodeMap.has(nextId)) {
          children.push(traverse(nextId, depth + 1));
        }
      }
    }

    return {
      id: nodeId,
      label: node?.label || nodeId,
      kind: node?.kind || 'unknown',
      children,
    };
  }

  return traverse(rootId, 0);
}

function renderTree() {
  if (!svgRef.value || !graphStore.selectedNodeId) return;

  const svg = d3Selection.select(svgRef.value);
  svg.selectAll('*').remove();

  const rootData = buildTree(graphStore.selectedNodeId, direction.value);
  const root = d3Hierarchy.hierarchy(rootData);

  const treeLayout = d3Hierarchy.tree<TreeNode>()
    .nodeSize([40, 200]);

  treeLayout(root);

  const width = svgRef.value.clientWidth;
  const height = svgRef.value.clientHeight;

  const g = svg.append('g')
    .attr('transform', `translate(${width / 4}, ${height / 2})`);

  // Zoom
  const zoom = d3Zoom.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  svg.call(zoom);
  svg.call(zoom.transform, d3Zoom.zoomIdentity.translate(width / 4, height / 2));

  // Links
  g.selectAll('.link')
    .data(root.links())
    .join('path')
    .attr('class', 'link')
    .attr('d', (d: any) => {
      return `M${d.source.y},${d.source.x}
              C${(d.source.y + d.target.y) / 2},${d.source.x}
               ${(d.source.y + d.target.y) / 2},${d.target.x}
               ${d.target.y},${d.target.x}`;
    })
    .attr('fill', 'none')
    .attr('stroke', '#444')
    .attr('stroke-width', 1.5);

  // Nodes
  const nodeGroups = g.selectAll('.node')
    .data(root.descendants())
    .join('g')
    .attr('class', 'node')
    .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
    .style('cursor', 'pointer')
    .on('click', (_event: any, d: any) => {
      graphStore.selectNode(d.data.id);
    });

  nodeGroups.append('circle')
    .attr('r', 8)
    .attr('fill', (d: any) => NODE_COLORS[d.data.kind as keyof typeof NODE_COLORS] || '#666');

  nodeGroups.append('text')
    .attr('x', 12)
    .attr('dy', 4)
    .attr('font-size', '12px')
    .attr('fill', '#ddd')
    .text((d: any) => d.data.label);
}

watch([() => graphStore.selectedNodeId, direction], () => {
  nextTick(renderTree);
});

onMounted(() => {
  if (graphStore.selectedNodeId) {
    renderTree();
  }
});
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
      <span class="text-sm text-gray-400">Direction:</span>
      <button
        @click="direction = 'dependencies'"
        :class="direction === 'dependencies' ? 'bg-blue-600' : 'bg-gray-700'"
        class="px-3 py-1 rounded text-sm text-white"
      >
        Dependencies →
      </button>
      <button
        @click="direction = 'dependents'"
        :class="direction === 'dependents' ? 'bg-blue-600' : 'bg-gray-700'"
        class="px-3 py-1 rounded text-sm text-white"
      >
        ← Dependents
      </button>
    </div>
    <div class="flex-1 relative">
      <svg ref="svgRef" class="w-full h-full bg-gray-900"></svg>
      <div v-if="!graphStore.selectedNodeId" class="absolute inset-0 flex items-center justify-center">
        <p class="text-gray-500">Select a node to view its dependency tree</p>
      </div>
    </div>
  </div>
</template>
