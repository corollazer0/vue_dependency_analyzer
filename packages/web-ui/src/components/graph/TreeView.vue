<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import * as d3Hierarchy from 'd3-hierarchy';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { useGraphStore } from '@/stores/graphStore';
import { NODE_COLORS } from '@/types/graph';
import type { NodeKind } from '@/types/graph';

const graphStore = useGraphStore();
const canvasRef = ref<HTMLCanvasElement>();
const canvasContainerRef = ref<HTMLElement>();
const direction = ref<'dependencies' | 'dependents'>('dependencies');
const treeDepth = ref(10);
const treeRootId = ref<string | null>(null);
const showLegend = ref(false);

interface TreeNode { id: string; label: string; kind: string; children: TreeNode[]; duplicate?: boolean; }

// Phase 3-7 — hybrid TreeView.
//   Graphical pane: Canvas 2D, drawn from d3-hierarchy positions. The previous
//     implementation rendered to SVG which, even with the Phase 1-5 D3 join
//     optimisation, ballooned the DOM at high depth slider settings. Canvas
//     keeps the cost proportional to *visible* nodes, not total tree size.
//   Explorer pane: vue-virtual-scroller flat list. Same TreeNode model
//     flattened depth-first, only the visible rows pay DOM cost.
// Both panes are driven from a single computed tree (`tree`) so a click in
// either selects in the other; treeRootId / direction / treeDepth are the
// shared inputs.

const tree = computed<TreeNode | null>(() => {
  if (!treeRootId.value || !graphStore.graphData) return null;
  return buildTree(treeRootId.value, direction.value, treeDepth.value);
});

const layoutRoot = computed<d3Hierarchy.HierarchyPointNode<TreeNode> | null>(() => {
  if (!tree.value) return null;
  const root = d3Hierarchy.hierarchy(tree.value);
  d3Hierarchy.tree<TreeNode>().nodeSize([28, 180])(root);
  return root as d3Hierarchy.HierarchyPointNode<TreeNode>;
});

const nodeCount = computed(() => layoutRoot.value?.descendants().length ?? 0);

function buildTree(rootId: string, dir: 'dependencies' | 'dependents', maxDepth: number): TreeNode {
  const nodes = graphStore.filteredNodes;
  const edges = graphStore.filteredEdges;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const REVERSE_SEMANTIC_KINDS = new Set(['api-serves', 'mybatis-maps']);
  const SKIP_IN_TREE = new Set(['dto-flows']);

  function traverse(nodeId: string, depth: number): TreeNode {
    const node = nodeMap.get(nodeId);
    const alreadyVisited = visited.has(nodeId);
    visited.add(nodeId);
    const children: TreeNode[] = [];
    if (alreadyVisited) {
      return { id: nodeId, label: node?.label || nodeId.split(':').pop() || nodeId, kind: node?.kind || 'unknown', children: [], duplicate: true };
    }
    if (depth < maxDepth) {
      const forward = edges.filter(e => e.source === nodeId && !SKIP_IN_TREE.has(e.kind));
      const reverse = edges.filter(e => e.target === nodeId && REVERSE_SEMANTIC_KINDS.has(e.kind));
      if (dir === 'dependencies') {
        for (const edge of forward) if (nodeMap.has(edge.target)) children.push(traverse(edge.target, depth + 1));
        for (const edge of reverse) if (nodeMap.has(edge.source)) children.push(traverse(edge.source, depth + 1));
      } else {
        const incoming = edges.filter(e => e.target === nodeId && !SKIP_IN_TREE.has(e.kind));
        const reverseOut = edges.filter(e => e.source === nodeId && REVERSE_SEMANTIC_KINDS.has(e.kind));
        for (const edge of incoming) if (nodeMap.has(edge.source)) children.push(traverse(edge.source, depth + 1));
        for (const edge of reverseOut) if (nodeMap.has(edge.target)) children.push(traverse(edge.target, depth + 1));
      }
    }
    return { id: nodeId, label: node?.label || nodeId.split(':').pop() || nodeId, kind: node?.kind || 'unknown', children };
  }
  return traverse(rootId, 0);
}

// ─── Canvas pane ───

let panX = 80;
let panY = 0;
let scale = 1;
let isDragging = false;
let dragLastX = 0;
let dragLastY = 0;
let dragMoved = false;

function renderCanvas() {
  const cv = canvasRef.value;
  const container = canvasContainerRef.value;
  if (!cv || !container) return;
  const rect = container.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  cv.width = Math.max(1, Math.floor(rect.width * ratio));
  cv.height = Math.max(1, Math.floor(rect.height * ratio));
  cv.style.width = `${rect.width}px`;
  cv.style.height = `${rect.height}px`;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const root = layoutRoot.value;
  if (!root) return;

  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(scale, scale);

  // Bezier links — match the SVG cubic curve `M src C mid,src mid,tgt tgt`.
  ctx.strokeStyle = '#3a4050';
  ctx.lineWidth = 1.5 / scale;
  ctx.beginPath();
  for (const link of root.links()) {
    const sx = link.source.y, sy = link.source.x;
    const tx = link.target.y, ty = link.target.x;
    const mx = (sx + tx) / 2;
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(mx, sy, mx, ty, tx, ty);
  }
  ctx.stroke();

  // Nodes — circle + label.
  const selected = graphStore.selectedNodeId;
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  for (const d of root.descendants()) {
    const x = d.y;
    const y = d.x;
    const r = d.depth === 0 ? 10 : 7;
    const colour = NODE_COLORS[d.data.kind as NodeKind] || '#666';
    if (d.data.duplicate) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.setLineDash([3, 2]);
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      if (d.data.id === selected) {
        ctx.strokeStyle = '#42b883';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (d.depth === 0) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.fillStyle = d.data.duplicate ? '#555' : '#a0a8b8';
    if (d.children) {
      ctx.textAlign = 'end';
      ctx.fillText(truncate(d.data.label, 35), x - 12, y);
    } else {
      ctx.textAlign = 'start';
      ctx.fillText(truncate(d.data.label, 35), x + 12, y);
    }
  }

  ctx.restore();
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function hitTest(canvasX: number, canvasY: number): d3Hierarchy.HierarchyPointNode<TreeNode> | null {
  const root = layoutRoot.value;
  if (!root) return null;
  const wx = (canvasX - panX) / scale;
  const wy = (canvasY - panY) / scale;
  for (const d of root.descendants()) {
    const dx = wx - d.y;
    const dy = wy - d.x;
    const r = (d.depth === 0 ? 12 : 9);
    if (dx * dx + dy * dy < r * r) return d;
  }
  return null;
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  isDragging = true;
  dragMoved = false;
  dragLastX = e.clientX;
  dragLastY = e.clientY;
}
function onMouseMove(e: MouseEvent) {
  if (!isDragging) return;
  const dx = e.clientX - dragLastX;
  const dy = e.clientY - dragLastY;
  if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
  panX += dx;
  panY += dy;
  dragLastX = e.clientX;
  dragLastY = e.clientY;
  renderCanvas();
}
function onMouseUp(e: MouseEvent) {
  isDragging = false;
  if (dragMoved) return;
  const cv = canvasRef.value;
  if (!cv) return;
  const rect = cv.getBoundingClientRect();
  const node = hitTest(e.clientX - rect.left, e.clientY - rect.top);
  if (!node) return;
  internalClick = true;
  graphStore.selectNode(node.data.id);
  renderCanvas();
}
function onDblClick(e: MouseEvent) {
  const cv = canvasRef.value;
  if (!cv) return;
  const rect = cv.getBoundingClientRect();
  const node = hitTest(e.clientX - rect.left, e.clientY - rect.top);
  if (node) graphStore.focusNode(node.data.id);
}
function onWheel(e: WheelEvent) {
  e.preventDefault();
  const cv = canvasRef.value;
  if (!cv) return;
  const rect = cv.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  const nx = (x - panX) / scale;
  const ny = (y - panY) / scale;
  scale = Math.max(0.1, Math.min(4, scale * factor));
  panX = x - nx * scale;
  panY = y - ny * scale;
  renderCanvas();
}

function fitView() {
  const root = layoutRoot.value;
  const container = canvasContainerRef.value;
  if (!root || !container) return;
  const rect = container.getBoundingClientRect();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const d of root.descendants()) {
    if (d.y < minX) minX = d.y;
    if (d.y > maxX) maxX = d.y;
    if (d.x < minY) minY = d.x;
    if (d.x > maxY) maxY = d.x;
  }
  if (!isFinite(minX)) return;
  const treeW = maxX - minX || 100;
  const treeH = maxY - minY || 100;
  scale = Math.min(1.2, (rect.width - 100) / (treeW + 100), (rect.height - 60) / (treeH + 60));
  scale = Math.max(0.1, scale);
  panX = (rect.width - treeW * scale) / 2 - minX * scale;
  panY = (rect.height - treeH * scale) / 2 - minY * scale;
  renderCanvas();
}

// ─── Explorer pane ───

interface FlatRow {
  key: string;
  nodeId: string;
  label: string;
  kind: NodeKind;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  duplicate: boolean;
}

const collapsedKeys = ref<Set<string>>(new Set());
const explorerRows = computed<FlatRow[]>(() => {
  const root = tree.value;
  if (!root) return [];
  const out: FlatRow[] = [];
  function walk(node: TreeNode, parent: string, depth: number) {
    const key = parent ? `${parent}/${node.id}` : node.id;
    const collapsed = collapsedKeys.value.has(key);
    out.push({
      key,
      nodeId: node.id,
      label: node.label,
      kind: node.kind as NodeKind,
      depth,
      hasChildren: node.children.length > 0,
      collapsed,
      duplicate: !!node.duplicate,
    });
    if (!collapsed) for (const c of node.children) walk(c, key, depth + 1);
  }
  walk(root, '', 0);
  return out;
});

function toggleRow(key: string) {
  const next = new Set(collapsedKeys.value);
  if (next.has(key)) next.delete(key); else next.add(key);
  collapsedKeys.value = next;
}

function selectFromExplorer(nodeId: string) {
  internalClick = true;
  graphStore.selectNode(nodeId);
  renderCanvas();
}

const ROW_HEIGHT = 22;

// ─── Reactivity glue ───

let internalClick = false;

watch(() => graphStore.focusNodeId, (id) => {
  if (id) treeRootId.value = id;
});

watch(() => graphStore.selectedNodeId, (id) => {
  if (id && !internalClick) treeRootId.value = id;
  internalClick = false;
  renderCanvas(); // selection highlight
});

watch([treeRootId, direction, treeDepth, () => graphStore.filteredNodes.length, () => graphStore.filteredEdges.length], () => {
  collapsedKeys.value = new Set();
  nextTick(() => { fitView(); renderCanvas(); });
});

const onResize = () => renderCanvas();

onMounted(() => {
  if (graphStore.selectedNodeId) treeRootId.value = graphStore.selectedNodeId;
  if (canvasContainerRef.value) {
    new ResizeObserver(() => nextTick(renderCanvas)).observe(canvasContainerRef.value);
  }
  window.addEventListener('resize', onResize);
  nextTick(() => { fitView(); renderCanvas(); });
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});

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
      <button @click="fitView" class="px-2 py-1 rounded-md text-xs" style="background: var(--surface-elevated); color: var(--text-secondary)">Fit</button>
      <button @click="showLegend = !showLegend" class="px-2 py-1 rounded-md text-xs transition-colors" style="background: var(--surface-elevated); color: var(--text-secondary)" title="Toggle legend">Legend</button>
      <span v-if="treeRootId" class="text-xs" style="color: var(--text-tertiary)">{{ nodeCount }} nodes</span>
    </div>

    <!-- Hybrid: explorer left, graphical right -->
    <div class="flex-1 flex min-h-0">
      <!-- Explorer (virtualised) -->
      <div class="flex flex-col flex-shrink-0 border-r" style="width: 280px; background: var(--surface-primary); border-color: var(--border-subtle)">
        <div class="px-3 py-1.5 text-xs font-medium border-b flex-shrink-0" style="color: var(--text-secondary); border-color: var(--border-subtle); background: var(--surface-secondary)">Explorer</div>
        <RecycleScroller
          v-if="explorerRows.length > 0"
          :items="explorerRows"
          :item-size="ROW_HEIGHT"
          key-field="key"
          class="flex-1 min-h-0"
          v-slot="{ item }"
        >
          <div
            class="flex items-center gap-1 px-1 cursor-pointer text-xs"
            :class="{ 'bg-white/10': graphStore.selectedNodeId === item.nodeId }"
            :style="{ height: ROW_HEIGHT + 'px', paddingLeft: (item.depth * 12 + 4) + 'px', opacity: item.duplicate ? 0.5 : 1 }"
            @click="selectFromExplorer(item.nodeId)"
            @dblclick="graphStore.focusNode(item.nodeId)"
          >
            <button
              v-if="item.hasChildren"
              class="w-3 text-center flex-shrink-0"
              style="color: var(--text-tertiary)"
              @click.stop="toggleRow(item.key)"
            >{{ item.collapsed ? '▸' : '▾' }}</button>
            <span v-else class="w-3 flex-shrink-0" />
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{
                backgroundColor: item.duplicate ? 'transparent' : (NODE_COLORS[item.kind] || '#666'),
                border: item.duplicate ? `1px dashed ${NODE_COLORS[item.kind] || '#666'}` : 'none',
              }"
            />
            <span class="truncate" style="color: var(--text-primary)">{{ item.label }}</span>
          </div>
        </RecycleScroller>
        <div v-else class="flex-1 flex items-center justify-center px-4 text-center text-xs" style="color: var(--text-tertiary)">
          {{ treeRootId ? 'Empty tree.' : 'Select a node first.' }}
        </div>
      </div>

      <!-- Canvas graphical -->
      <div ref="canvasContainerRef" class="flex-1 relative" style="background: var(--surface-primary)">
        <canvas
          ref="canvasRef"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @mouseleave="isDragging = false"
          @dblclick="onDblClick"
          @wheel="onWheel"
          style="display: block; cursor: grab"
        />

        <div v-if="!treeRootId" class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="text-center">
            <p class="text-sm" style="color: var(--text-tertiary)">Select a node in the Graph view first</p>
            <p class="text-xs mt-2" style="color: var(--text-tertiary)">Click = select · Double-click = re-root tree</p>
          </div>
        </div>

        <Transition name="fade">
          <div v-if="showLegend" class="absolute top-3 right-3 z-40 rounded-lg border p-4 min-w-[220px] text-xs backdrop-blur-sm"
            style="background: var(--surface-elevated); border-color: var(--border-subtle)">
            <div class="flex items-center justify-between mb-3">
              <span class="font-semibold" style="color: var(--text-primary)">Tree Legend</span>
              <button @click="showLegend = false" class="hover:bg-white/10 rounded px-1" style="color: var(--text-tertiary)">×</button>
            </div>
            <div class="mb-3 pb-3 border-b" style="border-color: var(--border-subtle)">
              <div class="font-medium mb-1.5" style="color: var(--text-secondary)">Interactions</div>
              <div class="space-y-1" style="color: var(--text-tertiary)">
                <div>Click → select</div>
                <div>Double-click → re-root tree</div>
                <div>Scroll → zoom · Drag → pan</div>
                <div>Explorer ▸/▾ → collapse subtree</div>
              </div>
            </div>
            <div>
              <div class="font-medium mb-1.5" style="color: var(--text-secondary)">Node Markers</div>
              <div class="space-y-1" style="color: var(--text-tertiary)">
                <div>Solid ring = root focus</div>
                <div>Green ring = selected</div>
                <div>Dashed = already shown elsewhere</div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
