<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { apiFetch } from '@/api/client';

const modules = ref<string[]>([]);
const matrix = ref<number[][]>([]);
const edgeDetails = ref<Record<string, string[]>>({});
const loading = ref(false);
const depth = ref(3);
const tooltip = ref<{ show: boolean; x: number; y: number; text: string }>({
  show: false, x: 0, y: 0, text: '',
});

// Phase 3-5 — Canvas 2D heatmap. The previous HTML <table> rendered N² <td>
// elements; for ~150 modules that's 22.5k DOM nodes and a multi-second layout
// pass. A single canvas paints the same view in a few milliseconds and stays
// crisp on HiDPI displays through devicePixelRatio scaling.
//
// Headers, cell fills, and grid live on the same surface; hover is computed
// from canvas-relative coordinates so we don't re-create the per-cell event
// listener overhead.

const canvas = ref<HTMLCanvasElement>();
const container = ref<HTMLDivElement>();

const LABEL_W = 180;
const LABEL_H = 110;
const MIN_CELL = 12;
const MAX_CELL = 28;
let cellSize = 18; // recomputed per render based on container width

async function fetchMatrix() {
  loading.value = true;
  try {
    const res = await apiFetch(`/api/graph/matrix?depth=${depth.value}`);
    const data = await res.json();
    modules.value = data.modules || [];
    matrix.value = data.matrix || [];
    edgeDetails.value = data.edgeDetails || {};
  } catch {
    modules.value = [];
    matrix.value = [];
  } finally {
    loading.value = false;
    await nextTick();
    render();
  }
}

function shortName(mod: string): string {
  const parts = mod.split('/');
  return parts.length > 2 ? parts.slice(-2).join('/') : mod;
}

// Both a fill colour and a flag for whether the pair is bidirectional.
// Bidirectional cells use orange tones (warmer ⇒ user attention), unidirectional
// use blue. Three intensity buckets (1-3, 4-9, ≥10) keep the legend static
// across module counts so cross-project comparisons remain meaningful.
function cellColor(value: number, row: number, col: number): string {
  if (value === 0) return 'transparent';
  const reverse = matrix.value[col]?.[row] || 0;
  const isBidi = reverse > 0 && row !== col;
  const palette = isBidi ? [
    'rgba(249, 115, 22, 0.25)',
    'rgba(249, 115, 22, 0.45)',
    'rgba(249, 115, 22, 0.7)',
  ] : [
    'rgba(59, 130, 246, 0.25)',
    'rgba(59, 130, 246, 0.45)',
    'rgba(59, 130, 246, 0.7)',
  ];
  if (value >= 10) return palette[2];
  if (value >= 4) return palette[1];
  return palette[0];
}

function render(): void {
  const cv = canvas.value;
  if (!cv) return;
  const N = modules.value.length;

  // Pick a cell size that fits the visible width without truncation. Capped to
  // MAX_CELL so a tiny matrix doesn't blow up into giant blocks; floored to
  // MIN_CELL so labels remain legible.
  const containerWidth = container.value?.clientWidth ?? 800;
  const available = Math.max(200, containerWidth - LABEL_W - 24);
  cellSize = N > 0
    ? Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(available / N)))
    : MIN_CELL;

  const totalW = LABEL_W + N * cellSize;
  const totalH = LABEL_H + N * cellSize;
  const ratio = window.devicePixelRatio || 1;
  cv.width = Math.max(1, Math.floor(totalW * ratio));
  cv.height = Math.max(1, Math.floor(totalH * ratio));
  cv.style.width = `${totalW}px`;
  cv.style.height = `${totalH}px`;

  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, totalW, totalH);

  if (N === 0) return;

  // Cell fills + numbers
  ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  for (let r = 0; r < N; r++) {
    const row = matrix.value[r] ?? [];
    for (let c = 0; c < N; c++) {
      const v = row[c] ?? 0;
      const x = LABEL_W + c * cellSize;
      const y = LABEL_H + r * cellSize;
      if (v > 0) {
        ctx.fillStyle = cellColor(v, r, c);
        ctx.fillRect(x, y, cellSize, cellSize);
        // Diagonal cells (self-loops) get an extra dashed border to call out
        // intra-module circular dependencies vs cross-module flow.
        if (r === c) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        }
        if (cellSize >= 18) {
          ctx.fillStyle = '#fff';
          ctx.fillText(String(v), x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
  }

  // Subtle grid — drawn once on top so empty cells are still discoverable.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const x = LABEL_W + i * cellSize + 0.5;
    ctx.moveTo(x, LABEL_H);
    ctx.lineTo(x, LABEL_H + N * cellSize);
    const y = LABEL_H + i * cellSize + 0.5;
    ctx.moveTo(LABEL_W, y);
    ctx.lineTo(LABEL_W + N * cellSize, y);
  }
  ctx.stroke();

  // Column labels — rotated 90° counter-clockwise so they fit between cells.
  ctx.fillStyle = '#a0a8b8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < N; c++) {
    const x = LABEL_W + c * cellSize + cellSize / 2;
    ctx.save();
    ctx.translate(x, LABEL_H - 4);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(truncate(shortName(modules.value[c]), 14), 4, 0);
    ctx.restore();
  }

  // Row labels — right-aligned in the gutter.
  ctx.textAlign = 'right';
  for (let r = 0; r < N; r++) {
    ctx.fillText(
      truncate(shortName(modules.value[r]), 24),
      LABEL_W - 6,
      LABEL_H + r * cellSize + cellSize / 2,
    );
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function hitTest(event: MouseEvent): { row: number; col: number } | null {
  const cv = canvas.value;
  if (!cv) return null;
  const rect = cv.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < LABEL_W || y < LABEL_H) return null;
  const c = Math.floor((x - LABEL_W) / cellSize);
  const r = Math.floor((y - LABEL_H) / cellSize);
  const N = modules.value.length;
  if (r < 0 || c < 0 || r >= N || c >= N) return null;
  return { row: r, col: c };
}

function onMouseMove(e: MouseEvent): void {
  const cell = hitTest(e);
  if (!cell) { tooltip.value.show = false; return; }
  const value = matrix.value[cell.row]?.[cell.col] ?? 0;
  if (value === 0) { tooltip.value.show = false; return; }
  const kinds = edgeDetails.value[`${cell.row}|${cell.col}`] ?? [];
  tooltip.value = {
    show: true,
    x: e.clientX + 12,
    y: e.clientY + 12,
    text: `${modules.value[cell.row]} → ${modules.value[cell.col]}: ${value} edge(s)\n${kinds.join(', ')}`,
  };
}

function onMouseLeave(): void {
  tooltip.value.show = false;
}

const onResize = () => render();

onMounted(() => {
  fetchMatrix();
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});

watch(depth, fetchMatrix);
</script>

<template>
  <div class="w-full h-full overflow-auto p-4" style="background: var(--surface-primary)">
    <!-- Controls -->
    <div class="flex items-center gap-4 mb-4">
      <label class="text-xs flex items-center gap-2" style="color: var(--text-secondary)">
        Depth:
        <input type="range" :min="1" :max="5" v-model.number="depth" class="w-24" style="accent-color: var(--accent-blue)" />
        <span class="w-4 text-center" style="color: var(--text-primary)">{{ depth }}</span>
      </label>
      <span v-if="loading" class="text-xs" style="color: var(--text-tertiary)">Loading...</span>
      <span v-else class="text-xs" style="color: var(--text-tertiary)">{{ modules.length }} modules</span>
    </div>

    <!-- Canvas heatmap -->
    <div ref="container" class="overflow-auto">
      <canvas
        v-show="modules.length > 0"
        ref="canvas"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
        style="cursor: crosshair; display: block"
      />
    </div>

    <div v-if="!loading && modules.length === 0" class="text-center py-16 text-sm" style="color: var(--text-tertiary)">
      No module data available. Run analysis first.
    </div>

    <!-- Tooltip -->
    <div
      v-if="tooltip.show"
      class="fixed z-50 px-3 py-2 rounded-lg text-xs shadow-xl border whitespace-pre-line pointer-events-none"
      style="background: var(--surface-elevated); border-color: var(--border-subtle); color: var(--text-primary)"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >{{ tooltip.text }}</div>

    <!-- Legend -->
    <div class="flex items-center gap-4 mt-4 text-xs" style="color: var(--text-tertiary)">
      <div class="flex items-center gap-1">
        <span class="w-4 h-4 rounded" style="background: rgba(59, 130, 246, 0.45)"></span> Unidirectional
      </div>
      <div class="flex items-center gap-1">
        <span class="w-4 h-4 rounded" style="background: rgba(249, 115, 22, 0.45)"></span> Bidirectional
      </div>
      <div class="flex items-center gap-1">
        <span class="w-4 h-4 rounded border" style="border-color: rgba(239, 68, 68, 0.6)"></span> Self-loop (intra-module cycle)
      </div>
    </div>
  </div>
</template>
