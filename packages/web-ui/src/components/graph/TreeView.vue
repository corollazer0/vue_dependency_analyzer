<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Selection from 'd3-selection';
import * as d3Zoom from 'd3-zoom';
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS } from '@/types/graph';

const graphStore = useGraphStore();
const svgRef = ref<SVGSVGElement>();
const direction = ref<'dependencies' | 'dependents'>('dependencies');
const treeDepth = ref(5);

interface TreeNode {
  id: string;
  label: string;
  kind: string;
  children: TreeNode[];
}

const nodeCount = computed(() => {
  if (!graphStore.selectedNodeId) return 0;
  const tree = buildTree(graphStore.selectedNodeId, direction.value, treeDepth.value);
  return countNodes(tree);
});

function countNodes(node: TreeNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

function buildTree(rootId: string, dir: 'dependencies' | 'dependents', maxDepth: number): TreeNode {
  const nodes = graphStore.filteredNodes;
  const edges = graphStore.filteredEdges;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();

  function traverse(nodeId: string, depth: number): TreeNode {
    const node = nodeMap.get(nodeId);
    visited.add(nodeId);
    const children: TreeNode[] = [];
    if (depth < maxDepth) {
      const connected = dir === 'dependencies'
        ? edges.filter(e => e.source === nodeId)
        : edges.filter(e => e.target === nodeId);
      for (const edge of connected) {
        const nextId = dir === 'dependencies' ? edge.target : edge.source;
        if (!visited.has(nextId) && nodeMap.has(nextId)) {
          children.push(traverse(nextId, depth + 1));
        }
      }
    }
    return { id: nodeId, label: node?.label || nodeId.split(':').pop() || nodeId, kind: node?.kind || 'unknown', children };
  }

  return traverse(rootId, 0);
}

function renderTree() {
  if (!svgRef.value || !graphStore.selectedNodeId) return;

  const svg = d3Selection.select(svgRef.value);
  svg.selectAll('*').remove();

  const rootData = buildTree(graphStore.selectedNodeId, direction.value, treeDepth.value);
  const root = d3Hierarchy.hierarchy(rootData);

  const nodeSize: [number, number] = [32, 180];
  const treeLayout = d3Hierarchy.tree<TreeNode>().nodeSize(nodeSize);
  treeLayout(root);

  const width = svgRef.value.clientWidth;
  const height = svgRef.value.clientHeight;

  // Calculate tree bounds to center it
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  root.each((d: any) => {
    if (d.x < minX) minX = d.x;
    if (d.x > maxX) maxX = d.x;
    if (d.y < minY) minY = d.y;
    if (d.y > maxY) maxY = d.y;
  });

  const treeWidth = maxY - minY + 200;
  const treeHeight = maxX - minX + 100;
  const scale = Math.min(1, Math.min(width / (treeWidth + 100), height / (treeHeight + 100)));
  const offsetX = 60;
  const offsetY = height / 2 - (minX + maxX) / 2 * scale;

  const g = svg.append('g');

  // Zoom
  const zoom = d3Zoom.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => { g.attr('transform', event.transform); });
  svg.call(zoom);
  svg.call(zoom.transform, d3Zoom.zoomIdentity.translate(offsetX, offsetY).scale(scale));

  // Links — curved paths
  g.selectAll('.link')
    .data(root.links())
    .join('path')
    .attr('d', (d: any) => `M${d.source.y},${d.source.x} C${(d.source.y + d.target.y) / 2},${d.source.x} ${(d.source.y + d.target.y) / 2},${d.target.x} ${d.target.y},${d.target.x}`)
    .attr('fill', 'none')
    .attr('stroke', '#3a4050')
    .attr('stroke-width', 1.5);

  // Nodes
  const nodeGroups = g.selectAll('.node')
    .data(root.descendants())
    .join('g')
    .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
    .style('cursor', 'pointer')
    .on('click', (_event: any, d: any) => {
      graphStore.selectNode(d.data.id);
    });

  nodeGroups.append('circle')
    .attr('r', (d: any) => d.depth === 0 ? 10 : 7)
    .attr('fill', (d: any) => NODE_COLORS[d.data.kind as keyof typeof NODE_COLORS] || '#666')
    .attr('stroke', (d: any) => d.depth === 0 ? '#fff' : 'none')
    .attr('stroke-width', (d: any) => d.depth === 0 ? 2 : 0);

  nodeGroups.append('text')
    .attr('x', (d: any) => d.children ? -12 : 12)
    .attr('dy', 4)
    .attr('text-anchor', (d: any) => d.children ? 'end' : 'start')
    .attr('font-size', '11px')
    .attr('fill', '#a0a8b8')
    .text((d: any) => {
      const label = d.data.label;
      return label.length > 30 ? label.slice(0, 27) + '...' : label;
    });

  // Root node highlight label
  const rootNode = root.descendants()[0];
  if (rootNode) {
    g.append('text')
      .attr('x', (rootNode as any).y)
      .attr('y', (rootNode as any).x - 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('fill', '#42b883')
      .text(rootNode.data.label);
  }
}

watch([() => graphStore.selectedNodeId, direction, treeDepth], () => {
  nextTick(renderTree);
});

onMounted(() => {
  if (graphStore.selectedNodeId) renderTree();
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 px-3 py-2 border-b" style="background: var(--surface-secondary); border-color: var(--border-subtle)">
      <button
        v-for="dir in [{id: 'dependencies', label: 'Dependencies →'}, {id: 'dependents', label: '← Dependents'}]"
        :key="dir.id"
        @click="direction = dir.id as any"
        class="px-3 py-1 rounded-md text-xs transition-colors"
        :style="{ background: direction === dir.id ? 'var(--accent-blue)' : 'var(--surface-elevated)', color: direction === dir.id ? '#fff' : 'var(--text-secondary)' }"
      >{{ dir.label }}</button>

      <div class="w-px h-5" style="background: var(--border-subtle)"></div>

      <label class="flex items-center gap-2 text-xs" style="color: var(--text-tertiary)">
        Depth:
        <input type="range" min="1" max="10" v-model.number="treeDepth" class="w-16 accent-blue-500" />
        <span style="color: var(--text-secondary)">{{ treeDepth }}</span>
      </label>

      <span v-if="graphStore.selectedNodeId" class="text-xs ml-auto" style="color: var(--text-tertiary)">
        {{ nodeCount }} nodes
      </span>
    </div>

    <!-- Tree SVG -->
    <div class="flex-1 relative" style="background: var(--surface-primary)">
      <svg ref="svgRef" class="w-full h-full"></svg>
      <div v-if="!graphStore.selectedNodeId" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <p class="text-sm" style="color: var(--text-tertiary)">Select a node in the Graph view to see its dependency tree</p>
          <p class="text-xs mt-2" style="color: var(--text-tertiary)">Click any node → switch to Tree tab</p>
        </div>
      </div>
    </div>
  </div>
</template>
