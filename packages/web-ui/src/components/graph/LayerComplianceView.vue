<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { apiFetch } from '@/api/client';
import { useGraphStore } from '@/stores/graphStore';

// Phase 7b-4 — F3 Layer Compliance view.
//
// Renders a layers × layers grid showing edge counts per cell and
// colours each cell by the configured layer DSL policy. Click a cell
// to surface the sample edges (and let the user click through to the
// graph). Plan suggested Canvas 2D — kept on HTML <table> for v1
// since layer counts are O(layers²) (typically < 100 cells); the
// Canvas migration is a follow-up if cell counts grow.

const graphStore = useGraphStore();

interface Layer { name: string; kinds: string[]; nodeIds: string[] }
interface Cell {
  from: string;
  to: string;
  count: number;
  status: 'allowed' | 'denied' | 'undefined';
  sampleEdgeIds: string[];
}
interface ComplianceData { layers: Layer[]; matrix: Cell[] }

const data = ref<ComplianceData | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
const focused = ref<{ row: string; col: string } | null>(null);

async function refresh(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const res = await apiFetch('/api/analysis/layer-compliance');
    if (!res.ok) {
      error.value = `Failed to load layer compliance (${res.status})`;
      data.value = null;
    } else {
      data.value = await res.json();
    }
  } catch (e: any) {
    error.value = e?.message || 'Layer compliance request failed';
    data.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

// Refresh whenever the graph data changes (e.g. after re-analysis).
watch(() => graphStore.graphData, () => { refresh(); });

function cellAt(row: string, col: string): Cell | undefined {
  return data.value?.matrix.find(c => c.from === row && c.to === col);
}

function cellStyle(c: Cell | undefined) {
  if (!c) return { background: 'var(--surface-primary)' };
  if (c.count === 0) {
    return { background: 'var(--surface-primary)', color: 'var(--text-tertiary)' };
  }
  if (c.status === 'denied') {
    return { background: 'rgba(239,68,68,0.18)', color: '#ef4444' };
  }
  if (c.status === 'allowed') {
    return { background: 'rgba(34,197,94,0.14)', color: '#22c55e' };
  }
  return { background: 'rgba(234,179,8,0.10)', color: '#eab308' };
}

function focus(row: string, col: string) {
  const c = cellAt(row, col);
  if (!c || c.count === 0) return;
  focused.value = { row, col };
  // If sample edges exist, jump to the first source node.
  if (c.sampleEdgeIds.length > 0) {
    const sampleEdge = graphStore.graphData?.edges.find(e => e.id === c.sampleEdgeIds[0]);
    if (sampleEdge) graphStore.focusNode(sampleEdge.source);
  }
}

function focusedCell(): Cell | undefined {
  if (!focused.value) return undefined;
  return cellAt(focused.value.row, focused.value.col);
}
</script>

<template>
  <div class="absolute inset-0 flex flex-col" style="background: var(--surface-primary)">
    <header class="h-10 flex items-center px-3 border-b" style="border-color: var(--border-subtle)">
      <h2 class="text-sm font-semibold" style="color: var(--text-primary)">Layer Compliance</h2>
      <button @click="refresh" class="ml-2 px-2 py-0.5 text-xs rounded hover:bg-white/5"
              style="color: var(--text-tertiary)" :disabled="loading" aria-label="Reload layer compliance">↻</button>
      <div class="flex-1"></div>
      <div class="flex items-center gap-3 text-xs" style="color: var(--text-tertiary)">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded inline-block" style="background:#22c55e"></span>Allowed</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded inline-block" style="background:#ef4444"></span>Denied</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded inline-block" style="background:#eab308"></span>Undefined</span>
      </div>
    </header>

    <div v-if="loading" class="p-6 text-center text-xs" style="color: var(--text-tertiary)">Loading…</div>
    <div v-else-if="error" class="p-6 text-center text-xs" style="color: #ef4444">{{ error }}</div>
    <div v-else-if="!data || data.layers.length === 0" class="p-6 text-center text-xs" style="color: var(--text-tertiary)">
      No <code>layers[]</code> in the project's <code>.vdarc.json</code>. See
      <code>docs/layer-dsl-examples.md</code>.
    </div>
    <div v-else class="flex-1 overflow-auto p-3">
      <table class="text-xs" role="grid" aria-label="Layer compliance matrix" style="border-collapse: collapse">
        <thead>
          <tr>
            <th class="px-2 py-1" style="color: var(--text-tertiary)">From ↓ / To →</th>
            <th v-for="l in data.layers" :key="l.name" class="px-2 py-1 font-mono"
                style="color: var(--text-secondary)">{{ l.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data.layers" :key="row.name">
            <th class="px-2 py-1 text-right font-mono" style="color: var(--text-secondary)">{{ row.name }}</th>
            <td v-for="col in data.layers" :key="col.name"
                @click="focus(row.name, col.name)"
                class="px-3 py-2 cursor-pointer transition-colors"
                :style="cellStyle(cellAt(row.name, col.name))"
                :title="`${row.name} → ${col.name}: ${cellAt(row.name, col.name)?.count ?? 0} edges`"
                :aria-selected="focused?.row === row.name && focused?.col === col.name"
            >{{ cellAt(row.name, col.name)?.count ?? 0 }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="focusedCell()" class="mt-4 text-xs">
        <p style="color: var(--text-secondary)">
          <strong>{{ focused?.row }} → {{ focused?.col }}</strong>
          · {{ focusedCell()!.count }} edge(s) · status: <em>{{ focusedCell()!.status }}</em>
        </p>
        <ul v-if="focusedCell()!.sampleEdgeIds.length > 0" class="mt-1 font-mono" style="color: var(--text-tertiary)">
          <li v-for="id in focusedCell()!.sampleEdgeIds" :key="id">{{ id }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
