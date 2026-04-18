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
const treeDepth = ref(10);
// Bug #2: separate tree root from selected node — click selects, double-click re-roots
const treeRootId = ref<string | null>(null);

interface TreeNode { id: string; label: string; kind: string; children: TreeNode[]; duplicate?: boolean; }

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
  // Edge kinds where the "semantic dependency" direction is reversed from the edge direction.
  const REVERSE_SEMANTIC_KINDS = new Set(['api-serves', 'mybatis-maps']);
  // Edge kinds to skip in tree traversal (these are cross-cutting analysis results, not dependency chains)
  const SKIP_IN_TREE = new Set(['dto-flows']);

  function traverse(nodeId: string, depth: number): TreeNode {
    const node = nodeMap.get(nodeId);
    const alreadyVisited = visited.has(nodeId);
    visited.add(nodeId);
    const children: TreeNode[] = [];

    // If already visited in another branch, show as leaf but mark as duplicate reference
    // Visually distinguished (dimmed + dashed) — no label pollution
    if (alreadyVisited) {
      return { id: nodeId, label: node?.label || nodeId.split(':').pop() || nodeId, kind: node?.kind || 'unknown', children: [], duplicate: true } as TreeNode;
    }

    if (depth < maxDepth) {
      const forward = edges.filter(e => e.source === nodeId && !SKIP_IN_TREE.has(e.kind));
      const reverse = edges.filter(e => e.target === nodeId && REVERSE_SEMANTIC_KINDS.has(e.kind));

      if (dir === 'dependencies') {
        for (const edge of forward) {
          const nextId = edge.target;
          if (nodeMap.has(nextId)) children.push(traverse(nextId, depth + 1));
        }
        for (const edge of reverse) {
          const nextId = edge.source;
          if (nodeMap.has(nextId)) children.push(traverse(nextId, depth + 1));
        }
      } else {
        const incoming = edges.filter(e => e.target === nodeId && !SKIP_IN_TREE.has(e.kind));
        const reverseOut = edges.filter(e => e.source === nodeId && REVERSE_SEMANTIC_KINDS.has(e.kind));
        for (const edge of incoming) {
          const nextId = edge.source;
          if (nodeMap.has(nextId)) children.push(traverse(nextId, depth + 1));
        }
        for (const edge of reverseOut) {
          const nextId = edge.target;
          if (nodeMap.has(nextId)) children.push(traverse(nextId, depth + 1));
        }
      }
    }
    return { id: nodeId, label: node?.label || nodeId.split(':').pop() || nodeId, kind: node?.kind || 'unknown', children };
  }
  return traverse(rootId, 0);
}

// Phase 1-5 — D3 join() pattern: persist <g>, <g.links>, <g.nodes>, <text.root-label>
// across renders. Re-render only diffs selections with a stable key. Avoids the
// full svg.selectAll('*').remove() teardown + re-creation (which was rebuilding the
// zoom behavior + every node group on every filter tick).
let zoomBehavior: d3Zoom.ZoomBehavior<SVGSVGElement, unknown> | null = null;

function renderTree() {
  if (!svgRef.value || !treeRootId.value) return;
  const svg = d3Selection.select(svgRef.value);

  // Bug #6,#7: ensure container has real dimensions
  const width = svgRef.value.clientWidth || 800;
  const height = svgRef.value.clientHeight || 600;
  if (width < 50 || height < 50) {
    requestAnimationFrame(() => renderTree());
    return;
  }

  const rootData = buildTree(treeRootId.value, direction.value, treeDepth.value);
  const root = d3Hierarchy.hierarchy(rootData);
  if (!root.descendants().length) {
    // Empty state — wipe any stale render
    svg.selectAll('g.tree-root').remove();
    return;
  }

  d3Hierarchy.tree<TreeNode>().nodeSize([32, 180])(root);

  let minX = Infinity, maxX = -Infinity;
  root.each((d: any) => { if (d.x < minX) minX = d.x; if (d.x > maxX) maxX = d.x; });

  const treeH = (maxX - minX) || 100;
  const scale = Math.min(1.2, (height - 60) / (treeH + 60));
  const centerX = 80;
  const centerY = height / 2 - ((minX + maxX) / 2) * scale;

  // Root <g> persists across renders; zoom behavior attaches once.
  let g = svg.select<SVGGElement>('g.tree-root');
  if (g.empty()) {
    g = svg.append('g').attr('class', 'tree-root');
    g.append('g').attr('class', 'links');
    g.append('g').attr('class', 'nodes');
    zoomBehavior = d3Zoom.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoomBehavior);
  }
  if (zoomBehavior) {
    svg.call(zoomBehavior.transform, d3Zoom.zoomIdentity.translate(centerX, centerY).scale(scale));
  }

  // Links — keyed by source.id→target.id so moves update in place.
  g.select<SVGGElement>('g.links').selectAll<SVGPathElement, d3Hierarchy.HierarchyPointLink<TreeNode>>('path')
    .data(root.links(), (d: any) => `${d.source.data.id}→${d.target.data.id}:${d.source.depth}`)
    .join(
      (enter) => enter.append('path').attr('fill', 'none').attr('stroke', '#3a4050').attr('stroke-width', 1.5),
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr('d', (d: any) => `M${d.source.y},${d.source.x} C${(d.source.y+d.target.y)/2},${d.source.x} ${(d.source.y+d.target.y)/2},${d.target.x} ${d.target.y},${d.target.x}`);

  // Nodes — keyed by node id+depth (same id may repeat at different depths, marked duplicate).
  const nodeGroups = g.select<SVGGElement>('g.nodes').selectAll<SVGGElement, d3Hierarchy.HierarchyPointNode<TreeNode>>('g.node')
    .data(root.descendants(), (d: any) => `${d.data.id}@${d.depth}`)
    .join(
      (enter) => {
        const ge = enter.append('g').attr('class', 'node').style('cursor', 'pointer');
        ge.append('circle');
        ge.append('text');
        return ge;
      },
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

  nodeGroups.on('click', (_e: any, d: any) => {
    internalClick = true;
    graphStore.selectNode(d.data.id);
    g.selectAll<SVGCircleElement, d3Hierarchy.HierarchyPointNode<TreeNode>>('g.node circle')
      .attr('stroke', (dd: any) => dd.depth === 0 ? '#fff' : 'none')
      .attr('stroke-width', (dd: any) => dd.depth === 0 ? 2 : 0);
    d3Selection.select(_e.currentTarget).select('circle').attr('stroke', '#42b883').attr('stroke-width', 3);
  });
  nodeGroups.on('dblclick', (_e: any, d: any) => {
    _e.stopPropagation();
    graphStore.focusNode(d.data.id);
  });

  nodeGroups.select<SVGCircleElement>('circle')
    .attr('r', (d: any) => d.depth === 0 ? 10 : 7)
    .attr('fill', (d: any) => d.data.duplicate ? 'none' : (NODE_COLORS[d.data.kind as keyof typeof NODE_COLORS] || '#666'))
    .attr('stroke', (d: any) => d.data.duplicate ? (NODE_COLORS[d.data.kind as keyof typeof NODE_COLORS] || '#666') : (d.depth === 0 ? '#fff' : 'none'))
    .attr('stroke-width', (d: any) => d.data.duplicate ? 1.5 : (d.depth === 0 ? 2 : 0))
    .attr('stroke-dasharray', (d: any) => d.data.duplicate ? '3 2' : 'none')
    .attr('opacity', (d: any) => d.data.duplicate ? 0.5 : 1);

  nodeGroups.select<SVGTextElement>('text')
    .attr('x', (d: any) => d.children ? -12 : 12).attr('dy', 4)
    .attr('text-anchor', (d: any) => d.children ? 'end' : 'start')
    .attr('font-size', '11px')
    .attr('fill', (d: any) => d.data.duplicate ? '#555' : '#a0a8b8')
    .attr('font-style', (d: any) => d.data.duplicate ? 'italic' : 'normal')
    .text((d: any) => { const l = d.data.label; return l.length > 35 ? l.slice(0, 32) + '...' : l; });

  // Root label — single element with a class, not appended fresh each time.
  const r0 = root.descendants()[0];
  g.selectAll<SVGTextElement, d3Hierarchy.HierarchyPointNode<TreeNode>>('text.root-label')
    .data(r0 ? [r0] : [], (d: any) => d.data.id)
    .join(
      (enter) => enter.append('text').attr('class', 'root-label')
        .attr('text-anchor', 'middle').attr('font-size', '13px').attr('font-weight', 'bold').attr('fill', '#42b883'),
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr('x', (d: any) => d.y)
    .attr('y', (d: any) => d.x - 18)
    .text((d: any) => d.data.label);
}

// focusNodeId: set by double-click — always re-roots tree
watch(() => graphStore.focusNodeId, (id) => {
  if (id) treeRootId.value = id;
});

// Any external node selection (Graph click, Search click) → update tree root
// Internal tree single-clicks set internalClick to prevent re-root loop
let internalClick = false;
watch(() => graphStore.selectedNodeId, (id) => {
  if (id && !internalClick) treeRootId.value = id;
  internalClick = false;
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

const showLegend = ref(false);

function setRootFromSelection() {
  if (graphStore.selectedNodeId) treeRootId.value = graphStore.selectedNodeId;
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 px-3 py-2 border-b flex-shrink-0" style="background: var(--surface-secondary); border-color: var(--border-subtle)">
      <button v-for="dir in [{id:'dependencies',label:'Dependencies →'},{id:'dependents',label:'← Dependents'}]" :key="dir.id" @click="direction = dir.id as any"
        class="px-3 py-1 rounded-md text-xs transition-colors" :style="{ background: direction === dir.id ? 'var(--accent-blue)' : 'var(--surface-elevated)', color: direction === dir.id ? '#fff' : 'var(--text-secondary)' }">{{ dir.label }}</button>
      <div class="w-px h-5" style="background: var(--border-subtle)"></div>
      <label class="flex items-center gap-2 text-xs" style="color: var(--text-tertiary)">Depth: <input type="range" min="1" max="20" v-model.number="treeDepth" class="w-16 accent-blue-500" /> <span style="color: var(--text-secondary)">{{ treeDepth }}</span></label>
      <div class="flex-1"></div>
      <button v-if="graphStore.selectedNodeId && graphStore.selectedNodeId !== treeRootId" @click="setRootFromSelection" class="px-2 py-1 rounded-md text-xs" style="background: var(--accent-vue); color: var(--text-inverse)" title="Re-root tree on selected node">Focus selected</button>
      <button @click="showLegend = !showLegend" class="px-2 py-1 rounded-md text-xs transition-colors" style="background: var(--surface-elevated); color: var(--text-secondary)" title="Toggle legend">Legend</button>
      <span v-if="treeRootId" class="text-xs" style="color: var(--text-tertiary)">{{ nodeCount }} nodes</span>
    </div>

    <!-- Tree area -->
    <div ref="containerRef" class="flex-1 relative" style="background: var(--surface-primary)">
      <svg ref="svgRef" class="w-full h-full"></svg>

      <!-- Empty state -->
      <div v-if="!treeRootId" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <p class="text-sm" style="color: var(--text-tertiary)">Select a node in the Graph view first</p>
          <p class="text-xs mt-2" style="color: var(--text-tertiary)">Click = select · Double-click = re-root tree</p>
        </div>
      </div>

      <!-- Legend panel -->
      <Transition name="fade">
        <div v-if="showLegend" class="absolute top-3 right-3 z-40 rounded-lg border p-4 min-w-[220px] text-xs backdrop-blur-sm"
          style="background: var(--surface-elevated); border-color: var(--border-subtle)">
          <div class="flex items-center justify-between mb-3">
            <span class="font-semibold" style="color: var(--text-primary)">Tree Legend</span>
            <button @click="showLegend = false" class="hover:bg-white/10 rounded px-1" style="color: var(--text-tertiary)">×</button>
          </div>

          <!-- Interactions -->
          <div class="mb-3 pb-3 border-b" style="border-color: var(--border-subtle)">
            <div class="font-medium mb-1.5" style="color: var(--text-secondary)">Interactions</div>
            <div class="space-y-1" style="color: var(--text-tertiary)">
              <div>Click node → select (detail panel)</div>
              <div>Double-click → re-root tree</div>
              <div>Scroll/pinch → zoom</div>
              <div>Drag → pan</div>
            </div>
          </div>

          <!-- Node styles -->
          <div class="mb-3 pb-3 border-b" style="border-color: var(--border-subtle)">
            <div class="font-medium mb-1.5" style="color: var(--text-secondary)">Node Styles</div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="#42b883" stroke="#fff" stroke-width="2"/></svg>
                <span style="color: var(--text-tertiary)">Root node (current focus)</span>
              </div>
              <div class="flex items-center gap-2">
                <svg width="16" height="16"><circle cx="8" cy="8" r="5" fill="#42b883"/></svg>
                <span style="color: var(--text-tertiary)">Normal node</span>
              </div>
              <div class="flex items-center gap-2">
                <svg width="16" height="16"><circle cx="8" cy="8" r="5" fill="none" stroke="#42b883" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.5"/></svg>
                <span style="color: var(--text-tertiary)">Already shown in another branch</span>
              </div>
              <div class="flex items-center gap-2">
                <svg width="16" height="16"><circle cx="8" cy="8" r="5" fill="#42b883" stroke="#42b883" stroke-width="3"/></svg>
                <span style="color: var(--text-tertiary)">Selected node</span>
              </div>
            </div>
          </div>

          <!-- Node colors -->
          <div>
            <div class="font-medium mb-1.5" style="color: var(--text-secondary)">Node Types</div>
            <div class="space-y-1">
              <div v-for="[kind, color] of [
                ['Vue Component', '#42b883'],
                ['Composable', '#a78bfa'],
                ['Pinia Store', '#ffd859'],
                ['API Call', '#ef4444'],
                ['Endpoint', '#8bc34a'],
                ['Controller', '#6db33f'],
                ['Service', '#4caf50'],
                ['Repository', '#4caf50'],
                ['@Mapper', '#e91e63'],
                ['MyBatis XML', '#e91e63'],
                ['SQL Statement', '#f06292'],
                ['DB Table', '#00bcd4'],
                ['Vue Event', '#f97316'],
                ['Spring Event', '#f97316'],
                ['Native Bridge', '#ff7043'],
              ]" :key="kind" class="flex items-center gap-2">
                <svg width="12" height="12"><circle cx="6" cy="6" r="5" :fill="color"/></svg>
                <span style="color: var(--text-tertiary)">{{ kind }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
