<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { apiFetch } from '@/api/client';

// Phase 11-10 — F12 Time Travel.
// Lists ArchSnapshot rows from /api/analysis/snapshots, lets the user
// pick from + to via two range sliders, and renders the diff using the
// /api/analysis/diff endpoint. No new chart library — we draw the
// node-count by-kind comparison as a simple HTML bar chart so the
// existing tailwind/d3 chunks stay enough.

interface SnapshotRow { label: string; takenAt: string }
interface KindBucketDiff {
  added: Array<{ kind: string; count: number }>;
  removed: Array<{ kind: string; was: number }>;
  changed: Array<{ kind: string; from: number; to: number; delta: number }>;
}
interface DiffResponse {
  fromLabel: string; toLabel: string;
  addedKinds: KindBucketDiff['added'];
  removedKinds: KindBucketDiff['removed'];
  changedKinds: KindBucketDiff['changed'];
  addedEdgeKinds: KindBucketDiff['added'];
  removedEdgeKinds: KindBucketDiff['removed'];
  changedEdgeKinds: KindBucketDiff['changed'];
  newHubs: string[];
  goneHubs: string[];
  totalsDelta: { nodes: number; edges: number };
}

const snapshots = ref<SnapshotRow[]>([]);
const loading = ref(false);
const loadError = ref<string | null>(null);
const fromIdx = ref(0);
const toIdx = ref(0);
const diff = ref<DiffResponse | null>(null);
const diffLoading = ref(false);

const fromLabel = computed(() => snapshots.value[fromIdx.value]?.label ?? '');
const toLabel = computed(() => snapshots.value[toIdx.value]?.label ?? '');

async function loadSnapshots(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    const res = await apiFetch('/api/analysis/snapshots');
    const data = await res.json();
    snapshots.value = data.snapshots ?? [];
    if (snapshots.value.length >= 2) {
      fromIdx.value = 0;
      toIdx.value = snapshots.value.length - 1;
      void loadDiff();
    }
  } catch (e: any) {
    loadError.value = e?.message || 'Failed to load snapshots';
  } finally {
    loading.value = false;
  }
}

async function loadDiff(): Promise<void> {
  if (!fromLabel.value || !toLabel.value || fromLabel.value === toLabel.value) {
    diff.value = null;
    return;
  }
  diffLoading.value = true;
  try {
    const url = `/api/analysis/diff?from=${encodeURIComponent(fromLabel.value)}&to=${encodeURIComponent(toLabel.value)}`;
    const res = await apiFetch(url);
    if (res.ok) diff.value = await res.json();
    else diff.value = null;
  } finally {
    diffLoading.value = false;
  }
}

onMounted(() => loadSnapshots());

// Bar values for the by-kind comparison chart. We pick the union of kinds
// present in either snapshot's added/removed/changed buckets so the chart
// only shows what actually moved.
const chartRows = computed(() => {
  if (!diff.value) return [] as Array<{ kind: string; from: number; to: number }>;
  const rows = new Map<string, { from: number; to: number }>();
  for (const a of diff.value.addedKinds) rows.set(a.kind, { from: 0, to: a.count });
  for (const r of diff.value.removedKinds) rows.set(r.kind, { from: r.was, to: 0 });
  for (const c of diff.value.changedKinds) rows.set(c.kind, { from: c.from, to: c.to });
  return [...rows.entries()]
    .map(([kind, v]) => ({ kind, ...v }))
    .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))
    .slice(0, 12);
});
const maxBar = computed(() => Math.max(1, ...chartRows.value.flatMap(r => [r.from, r.to])));
</script>

<template>
  <div class="absolute inset-0 overflow-y-auto p-4 text-sm" style="color: var(--text-primary)">
    <div class="max-w-3xl mx-auto space-y-4">
      <header class="flex items-baseline justify-between">
        <h2 class="text-lg font-semibold">Time Travel</h2>
        <button @click="loadSnapshots" class="text-xs px-2 py-1 rounded border" style="border-color: var(--border-subtle); color: var(--text-tertiary)">↻ Reload</button>
      </header>

      <div v-if="loading" class="text-xs" style="color: var(--text-tertiary)">Loading snapshots…</div>
      <div v-else-if="loadError" class="text-xs" style="color: #ef4444">{{ loadError }}</div>
      <div v-else-if="snapshots.length < 2" class="rounded p-3 text-xs" style="background: var(--surface-elevated); color: var(--text-secondary)">
        At least two snapshots are needed for a diff. Run
        <code class="px-1 rounded" style="background: rgba(0,0,0,0.3)">vda snapshot --label &lt;name&gt;</code>
        from CI nightly (Phase 11-11) or locally to populate.
        <br />Currently stored: {{ snapshots.length }} snapshot(s).
      </div>
      <div v-else>
        <!-- Range sliders -->
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <label class="text-xs w-12" style="color: var(--text-tertiary)">From</label>
            <input
              type="range"
              :min="0" :max="snapshots.length - 1" v-model.number="fromIdx"
              @change="loadDiff"
              class="flex-1"
              style="accent-color: var(--accent-blue)"
            />
            <span class="text-xs font-mono w-32 text-right" style="color: var(--text-secondary)">{{ fromLabel }}</span>
          </div>
          <div class="flex items-center gap-3">
            <label class="text-xs w-12" style="color: var(--text-tertiary)">To</label>
            <input
              type="range"
              :min="0" :max="snapshots.length - 1" v-model.number="toIdx"
              @change="loadDiff"
              class="flex-1"
              style="accent-color: var(--accent-blue)"
            />
            <span class="text-xs font-mono w-32 text-right" style="color: var(--text-secondary)">{{ toLabel }}</span>
          </div>
        </div>

        <div v-if="diffLoading" class="text-xs mt-3" style="color: var(--text-tertiary)">Loading diff…</div>
        <div v-else-if="!diff" class="text-xs mt-3" style="color: var(--text-tertiary)">Select two distinct snapshots.</div>
        <div v-else class="mt-4 space-y-4">
          <!-- Totals -->
          <div class="rounded p-3 text-xs" style="background: var(--surface-elevated)">
            <div class="font-semibold mb-1" style="color: var(--text-primary)">{{ diff.fromLabel }} → {{ diff.toLabel }}</div>
            <div style="color: var(--text-secondary)">
              <span :style="{ color: diff.totalsDelta.nodes >= 0 ? '#22c55e' : '#ef4444' }">
                {{ diff.totalsDelta.nodes >= 0 ? '+' : '' }}{{ diff.totalsDelta.nodes }} nodes
              </span>
              ·
              <span :style="{ color: diff.totalsDelta.edges >= 0 ? '#22c55e' : '#ef4444' }">
                {{ diff.totalsDelta.edges >= 0 ? '+' : '' }}{{ diff.totalsDelta.edges }} edges
              </span>
            </div>
          </div>

          <!-- By-kind comparison chart -->
          <div v-if="chartRows.length > 0" class="rounded p-3" style="background: var(--surface-elevated)">
            <h3 class="text-xs font-semibold mb-2" style="color: var(--text-primary)">Node count by kind (top 12 changed)</h3>
            <div class="space-y-1">
              <div v-for="row in chartRows" :key="row.kind" class="flex items-center gap-2 text-xs">
                <div class="w-32 truncate font-mono" style="color: var(--text-secondary)" :title="row.kind">{{ row.kind }}</div>
                <div class="flex-1 flex items-center gap-1">
                  <div class="h-3 rounded" :style="{ width: `${(row.from / maxBar) * 100}%`, background: 'var(--accent-blue)', minWidth: '2px', opacity: 0.45 }"></div>
                  <div class="h-3 rounded" :style="{ width: `${(row.to / maxBar) * 100}%`, background: 'var(--accent-blue)', minWidth: '2px' }"></div>
                </div>
                <div class="w-24 text-right font-mono" :style="{ color: row.to - row.from === 0 ? 'var(--text-tertiary)' : (row.to - row.from > 0 ? '#22c55e' : '#ef4444') }">
                  {{ row.from }} → {{ row.to }} ({{ row.to - row.from >= 0 ? '+' : '' }}{{ row.to - row.from }})
                </div>
              </div>
            </div>
          </div>

          <!-- Hub deltas -->
          <div v-if="diff.newHubs.length > 0 || diff.goneHubs.length > 0" class="rounded p-3" style="background: var(--surface-elevated)">
            <h3 class="text-xs font-semibold mb-2" style="color: var(--text-primary)">Hub sample movement</h3>
            <div v-if="diff.newHubs.length > 0">
              <div class="text-xs" style="color: #22c55e">+ New hubs ({{ diff.newHubs.length }})</div>
              <ul class="text-xs font-mono" style="color: var(--text-secondary)">
                <li v-for="id in diff.newHubs.slice(0, 10)" :key="id" class="truncate">{{ id }}</li>
                <li v-if="diff.newHubs.length > 10">…and {{ diff.newHubs.length - 10 }} more</li>
              </ul>
            </div>
            <div v-if="diff.goneHubs.length > 0" class="mt-2">
              <div class="text-xs" style="color: #ef4444">- Gone hubs ({{ diff.goneHubs.length }})</div>
              <ul class="text-xs font-mono" style="color: var(--text-secondary)">
                <li v-for="id in diff.goneHubs.slice(0, 10)" :key="id" class="truncate">{{ id }}</li>
                <li v-if="diff.goneHubs.length > 10">…and {{ diff.goneHubs.length - 10 }} more</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
