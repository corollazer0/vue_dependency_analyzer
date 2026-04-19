<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { apiFetch } from '@/api/client';
import { useGraphStore } from '@/stores/graphStore';

// Phase 9-5 / 9-6 — F4 Feature Slice + intersection view.
//
// Lists every feature declared in `.vdarc.json`, lets the user pick
// one, and renders its slice inline as a flat node list. Bottom
// section enumerates intersections between every feature pair (the
// "결제와 주문이 공유하는 노드" use-case from plan §1-1).

interface FeatureSummary { id: string; entry: string; description?: string }
interface SliceData {
  feature: FeatureSummary;
  nodes: Array<{ id: string; kind: string; label: string }>;
  edges: Array<{ id: string; source: string; target: string; kind: string }>;
}
interface IntersectionPair { a: string; b: string; sharedNodeIds: string[] }

const graphStore = useGraphStore();

const features = ref<FeatureSummary[]>([]);
const selectedId = ref<string | null>(null);
const slice = ref<SliceData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const intersections = ref<IntersectionPair[]>([]);

async function loadFeatures(): Promise<void> {
  // Pull feature list from the analyzed graph metadata (server stuffs
  // config into graphData.metadata.config when serializing). The web-ui
  // GraphData type is narrower than the server-side payload, so we
  // cast through `unknown` to read the embedded config.
  const md = graphStore.graphData?.metadata as unknown as
    | { config?: { features?: FeatureSummary[] } }
    | undefined;
  features.value = md?.config?.features ?? [];
}

async function loadSlice(id: string): Promise<void> {
  loading.value = true;
  error.value = null;
  slice.value = null;
  try {
    const res = await apiFetch(`/api/graph/feature/${encodeURIComponent(id)}`);
    if (!res.ok) {
      error.value = res.status === 404
        ? 'Feature not declared in .vdarc.json'
        : `Failed to load feature slice (${res.status})`;
      return;
    }
    slice.value = await res.json();
  } catch (e: any) {
    error.value = e?.message || 'Slice request failed';
  } finally {
    loading.value = false;
  }
}

async function loadIntersections(): Promise<void> {
  try {
    const res = await apiFetch('/api/graph/feature-intersections');
    if (!res.ok) return;
    const data = await res.json();
    intersections.value = data.pairs ?? [];
  } catch {
    intersections.value = [];
  }
}

function pick(id: string) {
  selectedId.value = id;
  loadSlice(id);
}

function focus(nodeId: string) {
  graphStore.focusNode(nodeId);
}

const sliceCounts = computed(() => {
  if (!slice.value) return null;
  const byKind = new Map<string, number>();
  for (const n of slice.value.nodes) {
    byKind.set(n.kind, (byKind.get(n.kind) ?? 0) + 1);
  }
  return [...byKind.entries()].sort((a, b) => b[1] - a[1]);
});

onMounted(async () => {
  await loadFeatures();
  await loadIntersections();
  if (features.value.length > 0) pick(features.value[0].id);
});
</script>

<template>
  <div class="absolute inset-0 flex flex-col" style="background: var(--surface-primary)">
    <header class="h-10 flex items-center px-3 border-b" style="border-color: var(--border-subtle)">
      <h2 class="text-sm font-semibold" style="color: var(--text-primary)">Feature Slice</h2>
      <span class="ml-2 text-xs" style="color: var(--text-tertiary)">
        — declared in <code>.vdarc.json features[]</code>
      </span>
    </header>

    <div v-if="features.length === 0" class="p-6 text-center text-xs" style="color: var(--text-tertiary)">
      No <code>features[]</code> in the project's <code>.vdarc.json</code>.
      Run <code>vda init</code> to scaffold a heuristic draft, then hand-curate.
    </div>

    <div v-else class="flex-1 flex overflow-hidden">
      <!-- Sidebar: feature list -->
      <aside class="flex-shrink-0 border-r overflow-y-auto"
             style="width: 220px; border-color: var(--border-subtle)">
        <ul role="listbox" aria-label="Features">
          <li v-for="f in features" :key="f.id">
            <button
              @click="pick(f.id)"
              class="w-full text-left px-3 py-2 text-xs transition-colors"
              :style="{
                background: selectedId === f.id ? 'rgba(52,152,219,0.18)' : 'transparent',
                color: 'var(--text-secondary)'
              }"
              role="option"
              :aria-selected="selectedId === f.id"
            >
              <div class="font-medium" style="color: var(--text-primary)">{{ f.id }}</div>
              <div class="font-mono text-[10px]" style="color: var(--text-tertiary)">{{ f.entry }}</div>
              <div v-if="f.description" class="mt-0.5">{{ f.description }}</div>
            </button>
          </li>
        </ul>
      </aside>

      <!-- Main: slice content + intersections -->
      <section class="flex-1 overflow-y-auto p-3 space-y-4">
        <div v-if="loading" class="text-xs text-center py-4" style="color: var(--text-tertiary)">Loading…</div>
        <div v-else-if="error" class="text-xs text-center py-4" style="color: #ef4444">{{ error }}</div>
        <template v-else-if="slice">
          <div>
            <h3 class="text-sm font-semibold" style="color: var(--text-primary)">
              {{ slice.feature.id }}
              <span class="font-normal text-xs ml-1" style="color: var(--text-tertiary)">
                · {{ slice.nodes.length }} nodes · {{ slice.edges.length }} edges
              </span>
            </h3>
            <p class="text-xs mt-1" style="color: var(--text-tertiary)">
              entry: <code>{{ slice.feature.entry }}</code>
            </p>
          </div>

          <div v-if="sliceCounts" class="grid grid-cols-3 gap-2 text-xs">
            <div v-for="[kind, count] in sliceCounts" :key="kind"
                 class="rounded p-2"
                 style="background: rgba(255,255,255,0.04)">
              <div class="font-mono" style="color: var(--text-secondary)">{{ kind }}</div>
              <div class="text-lg font-bold" style="color: var(--text-primary)">{{ count }}</div>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-semibold mb-1" style="color: var(--text-secondary)">Nodes</h4>
            <ul class="max-h-60 overflow-y-auto space-y-0.5 text-xs">
              <li v-for="n in slice.nodes.slice(0, 100)" :key="n.id">
                <button
                  @click="focus(n.id)"
                  class="w-full text-left px-2 py-1 rounded hover:bg-white/5"
                  style="color: var(--text-secondary)"
                >
                  <span class="font-mono text-[10px]" style="color: var(--text-tertiary)">{{ n.kind }}</span>
                  <span class="ml-2">{{ n.label }}</span>
                </button>
              </li>
              <li v-if="slice.nodes.length > 100" class="px-2 py-1 text-[10px]" style="color: var(--text-tertiary)">
                …and {{ slice.nodes.length - 100 }} more
              </li>
            </ul>
          </div>
        </template>

        <!-- Phase 9-6 intersections -->
        <div v-if="intersections.length > 0" class="pt-3 border-t"
             style="border-color: var(--border-subtle)">
          <h3 class="text-sm font-semibold" style="color: var(--text-primary)">
            Cross-feature shared nodes
            <span class="font-normal text-xs ml-1" style="color: var(--text-tertiary)">
              · {{ intersections.length }} pair(s)
            </span>
          </h3>
          <ul class="mt-2 space-y-2 text-xs">
            <li v-for="pair in intersections" :key="`${pair.a}|${pair.b}`"
                class="rounded p-2"
                style="background: rgba(255,255,255,0.03)">
              <div style="color: var(--text-secondary)">
                <strong>{{ pair.a }}</strong> ∩ <strong>{{ pair.b }}</strong>
                <span class="ml-1" style="color: var(--text-tertiary)">
                  · {{ pair.sharedNodeIds.length }} node(s)
                </span>
              </div>
              <ul class="mt-1 max-h-24 overflow-y-auto font-mono text-[10px]"
                  style="color: var(--text-tertiary)">
                <li v-for="id in pair.sharedNodeIds.slice(0, 8)" :key="id">{{ id }}</li>
                <li v-if="pair.sharedNodeIds.length > 8">…</li>
              </ul>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>
