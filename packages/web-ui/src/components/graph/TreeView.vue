<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Selection from 'd3-selection';
import * as d3Zoom from 'd3-zoom';
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS } from '@/types/graph';

const graphStore = useGraphStore();
const svgRef = ref<SVGSVGElement>();
const containerRef = ref<HTMLElement>();
const direction = ref<'dependencies' | 'dependents'>('dependencies');
const treeDepth = ref(5);
// Bug #2: separate tree root from selected node — click selects, double-click re-roots
const treeRootId = ref<string | null>(null);

interface TreeNode { id: string; label: string; kind: string; children: TreeNode[]; }

const nodeCount = computed(() => {
  if (!treeRootId.value) return 0;
  return countNodes(buildTree(treeRootId.value, direction.value, treeDepth.value));
});

function countNodes(n: TreeNode): number { return 1 + n.children.reduce((s, c) => s + countNodes(c), 0); }

function buildTree(rootId: string, dir: 'dependencies' | 'dependents', maxDepth: number): TreeNode {
  const nodes = graphStore.filteredNodes; // Bug #1: uses filtered data
  const edges = graphStore.filteredEdges;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  function traverse(nodeId: string, depth: number): TreeNode {
    const node = nodeMap.get(nodeId);
    visited.add(nodeId);
    const children: TreeNode[] = [];
    if (depth < maxDepth) {
      const connected = dir === 'dependencies' ? edges.filter(e => e.source === nodeId) : edges.filter(e => e.target === nodeId);
      for (const edge of connected) {
        const nextId = dir === 'dependencies' ? edge.target : edge.source;
        if (!visited.has(nextId) && nodeMap.has(nextId)) children.push(traverse(nextId, depth + 1));
      }
    }
    return { id: nodeId, label: node?.label || nodeId.split(':').pop() || nodeId, kind: node?.kind || 'unknown', children };
  }
  return traverse(rootId, 0);
}

function renderTree() {
  if (!svgRef.value || !treeRootId.value) return;
  const svg = d3Selection.select(svgRef.value);
  svg.selectAll('*').remove();

  // Bug #6,#7: ensure container has real dimensions
  const width = svgRef.value.clientWidth || 800;
  const height = svgRef.value.clientHeight || 600;
  if (width < 50 || height < 50) {
    requestAnimationFrame(() => renderTree());
    return;
  }

  const rootData = buildTree(treeRootId.value, direction.value, treeDepth.value);
  const root = d3Hierarchy.hierarchy(rootData);
  if (!root.descendants().length) return;

  d3Hierarchy.tree<TreeNode>().nodeSize([32, 180])(root);

  let minX = Infinity, maxX = -Infinity;
  root.each((d: any) => { if (d.x < minX) minX = d.x; if (d.x > maxX) maxX = d.x; });

  // Bug #6: proper centering
  const treeH = (maxX - minX) || 100;
  const scale = Math.min(1.2, (height - 60) / (treeH + 60));
  const centerX = 80;
  const centerY = height / 2 - ((minX + maxX) / 2) * scale;

  const g = svg.append('g');
  const zoom = d3Zoom.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform));
  svg.call(zoom);
  svg.call(zoom.transform, d3Zoom.zoomIdentity.translate(centerX, centerY).scale(scale));

  // Links
  g.selectAll('.link').data(root.links()).join('path')
    .attr('d', (d: any) => `M${d.source.y},${d.source.x} C${(d.source.y+d.target.y)/2},${d.source.x} ${(d.source.y+d.target.y)/2},${d.target.x} ${d.target.y},${d.target.x}`)
    .attr('fill', 'none').attr('stroke', '#3a4050').attr('stroke-width', 1.5);

  // Nodes
  const nodeGroups = g.selectAll('.node').data(root.descendants()).join('g')
    .attr('transform', (d: any) => `translate(${d.y},${d.x})`).style('cursor', 'pointer');

  // Bug #2: single click = select (detail panel), double click = re-root tree
  nodeGroups.on('click', (_e: any, d: any) => {
    graphStore.selectNode(d.data.id);
    // Visual highlight
    g.selectAll('circle').attr('stroke', (dd: any) => dd.depth === 0 ? '#fff' : 'none').attr('stroke-width', (dd: any) => dd.depth === 0 ? 2 : 0);
    d3Selection.select(_e.currentTarget).select('circle').attr('stroke', '#42b883').attr('stroke-width', 3);
  });
  nodeGroups.on('dblclick', (_e: any, d: any) => {
    _e.stopPropagation();
    treeRootId.value = d.data.id;
  });

  nodeGroups.append('circle')
    .attr('r', (d: any) => d.depth === 0 ? 10 : 7)
    .attr('fill', (d: any) => NODE_COLORS[d.data.kind as keyof typeof NODE_COLORS] || '#666')
    .attr('stroke', (d: any) => d.depth === 0 ? '#fff' : 'none')
    .attr('stroke-width', (d: any) => d.depth === 0 ? 2 : 0);

  nodeGroups.append('text')
    .attr('x', (d: any) => d.children ? -12 : 12).attr('dy', 4)
    .attr('text-anchor', (d: any) => d.children ? 'end' : 'start')
    .attr('font-size', '11px').attr('fill', '#a0a8b8')
    .text((d: any) => { const l = d.data.label; return l.length > 30 ? l.slice(0, 27) + '...' : l; });

  // Root label
  const r0 = root.descendants()[0];
  if (r0) {
    g.append('text').attr('x', (r0 as any).y).attr('y', (r0 as any).x - 18)
      .attr('text-anchor', 'middle').attr('font-size', '13px').attr('font-weight', 'bold')
      .attr('fill', '#42b883').text(r0.data.label);
  }
}

// Set tree root from graph selection (only if no root yet)
watch(() => graphStore.selectedNodeId, (id) => {
  if (id && !treeRootId.value) treeRootId.value = id;
});

// Bug #1: re-render when filters change
watch([treeRootId, direction, treeDepth, () => graphStore.filteredNodes.length, () => graphStore.filteredEdges.length], () => {
  nextTick(renderTree);
});

// Bug #7: ResizeObserver to handle tab switch visibility
onMounted(() => {
  if (graphStore.selectedNodeId) treeRootId.value = graphStore.selectedNodeId;
  if (containerRef.value) {
    new ResizeObserver(() => { if (treeRootId.value) nextTick(renderTree); }).observe(containerRef.value);
  }
});

function setRootFromSelection() {
  if (graphStore.selectedNodeId) treeRootId.value = graphStore.selectedNodeId;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-3 px-3 py-2 border-b flex-shrink-0" style="background: var(--surface-secondary); border-color: var(--border-subtle)">
      <button v-for="dir in [{id:'dependencies',label:'Dependencies →'},{id:'dependents',label:'← Dependents'}]" :key="dir.id" @click="direction = dir.id as any"
        class="px-3 py-1 rounded-md text-xs transition-colors" :style="{ background: direction === dir.id ? 'var(--accent-blue)' : 'var(--surface-elevated)', color: direction === dir.id ? '#fff' : 'var(--text-secondary)' }">{{ dir.label }}</button>
      <div class="w-px h-5" style="background: var(--border-subtle)"></div>
      <label class="flex items-center gap-2 text-xs" style="color: var(--text-tertiary)">Depth: <input type="range" min="1" max="10" v-model.number="treeDepth" class="w-16 accent-blue-500" /> <span style="color: var(--text-secondary)">{{ treeDepth }}</span></label>
      <div class="flex-1"></div>
      <button v-if="graphStore.selectedNodeId && graphStore.selectedNodeId !== treeRootId" @click="setRootFromSelection" class="px-2 py-1 rounded-md text-xs" style="background: var(--accent-vue); color: var(--text-inverse)" title="Re-root tree on selected node">Focus selected</button>
      <span v-if="treeRootId" class="text-xs" style="color: var(--text-tertiary)">{{ nodeCount }} nodes</span>
    </div>
    <div ref="containerRef" class="flex-1 relative" style="background: var(--surface-primary)">
      <svg ref="svgRef" class="w-full h-full"></svg>
      <div v-if="!treeRootId" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <p class="text-sm" style="color: var(--text-tertiary)">Select a node in the Graph view first</p>
          <p class="text-xs mt-2" style="color: var(--text-tertiary)">Click = select · Double-click = re-root tree</p>
        </div>
      </div>
    </div>
  </div>
</template>
