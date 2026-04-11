<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { apiFetch } from '@/api/client';

const modules = ref<string[]>([]);
const matrix = ref<number[][]>([]);
const edgeDetails = ref<Record<string, string[]>>({});
const loading = ref(false);
const depth = ref(3);
const tooltip = ref<{ show: boolean; x: number; y: number; text: string }>({ show: false, x: 0, y: 0, text: '' });

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
  }
}

onMounted(fetchMatrix);
watch(depth, fetchMatrix);

function cellColor(value: number, row: number, col: number): string {
  if (value === 0) return 'transparent';
  // Bidirectional? Check if reverse cell also has edges
  const reverse = matrix.value[col]?.[row] || 0;
  if (reverse > 0 && row !== col) {
    // Bidirectional — orange tones
    if (value >= 10) return 'rgba(249, 115, 22, 0.7)';
    if (value >= 4) return 'rgba(249, 115, 22, 0.45)';
    return 'rgba(249, 115, 22, 0.25)';
  }
  // Unidirectional — blue tones
  if (value >= 10) return 'rgba(59, 130, 246, 0.7)';
  if (value >= 4) return 'rgba(59, 130, 246, 0.45)';
  return 'rgba(59, 130, 246, 0.25)';
}

function shortName(mod: string): string {
  const parts = mod.split('/');
  return parts.length > 2 ? parts.slice(-2).join('/') : mod;
}

function showTooltip(event: MouseEvent, row: number, col: number) {
  const value = matrix.value[row]?.[col] || 0;
  if (value === 0) { tooltip.value.show = false; return; }
  const key = `${row}|${col}`;
  const kinds = edgeDetails.value[key] || [];
  tooltip.value = {
    show: true,
    x: event.clientX + 10,
    y: event.clientY + 10,
    text: `${modules.value[row]} → ${modules.value[col]}: ${value} edge(s)\n${kinds.join(', ')}`,
  };
}
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

    <!-- Matrix -->
    <div v-if="modules.length > 0" class="overflow-auto">
      <table class="border-collapse text-xs" style="min-width: max-content">
        <thead>
          <tr>
            <th class="sticky left-0 z-10 px-2 py-1" style="background: var(--surface-primary)"></th>
            <th
              v-for="(mod, ci) in modules" :key="ci"
              class="px-1 py-1 font-normal"
              style="color: var(--text-tertiary); writing-mode: vertical-lr; transform: rotate(180deg); max-height: 120px"
            >{{ shortName(mod) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in matrix" :key="ri">
            <td
              class="sticky left-0 z-10 px-2 py-0.5 truncate max-w-[200px] font-medium"
              style="background: var(--surface-primary); color: var(--text-secondary)"
              :title="modules[ri]"
            >{{ shortName(modules[ri]) }}</td>
            <td
              v-for="(value, ci) in row" :key="ci"
              class="w-8 h-8 text-center border cursor-pointer transition-colors"
              :style="{
                backgroundColor: cellColor(value, ri, ci),
                borderColor: 'var(--border-subtle)',
                color: value > 0 ? '#fff' : 'transparent',
              }"
              @mouseenter="showTooltip($event, ri, ci)"
              @mouseleave="tooltip.show = false"
            >{{ value || '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="text-center py-16 text-sm" style="color: var(--text-tertiary)">
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
    </div>
  </div>
</template>
