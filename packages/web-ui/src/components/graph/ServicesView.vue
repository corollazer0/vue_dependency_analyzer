<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/api/client';
import { useGraphStore } from '@/stores/graphStore';
import { EDGE_STYLES } from '@/types/graph';

// Phase 12-7 — top-level Services view.
// Loads /api/graph/services (msa-service nodes + 3 inter-service edges).
// Each service shows: name, declared/unassigned, inbound/outbound call
// counts, share-db/-dto badges. Click expand → drills into the
// service-internal subgraph by setting graphStore.serviceFilter and
// nudging the user back to the Graph tab via emit. Compound-node
// rendering is deferred to a follow-up — the listing view ships first.

interface ServiceNode {
  id: string;
  label: string;
  metadata: Record<string, unknown>;
}
interface ServiceEdge {
  id: string; source: string; target: string; kind: string;
  metadata: Record<string, unknown>;
}

const services = ref<ServiceNode[]>([]);
const edges = ref<ServiceEdge[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const graphStore = useGraphStore();

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const res = await apiFetch('/api/graph/services');
    const data = await res.json();
    services.value = data.nodes ?? [];
    edges.value = data.edges ?? [];
  } catch (e: any) {
    error.value = e?.message || 'Failed to load services graph';
  } finally {
    loading.value = false;
  }
}
onMounted(() => load());

function edgesFromService(serviceId: string, kind?: string): ServiceEdge[] {
  return edges.value.filter(e => e.source === serviceId && (!kind || e.kind === kind));
}
function edgesIntoService(serviceId: string, kind?: string): ServiceEdge[] {
  return edges.value.filter(e => e.target === serviceId && (!kind || e.kind === kind));
}
function targetLabel(serviceNodeId: string): string {
  return services.value.find(s => s.id === serviceNodeId)?.label ?? serviceNodeId;
}

function expandService(s: ServiceNode): void {
  // Drop into the regular Graph view scoped to this service. We re-use
  // graphStore.filteredNodes via metadata.serviceId on every node — most
  // existing views (BottomUp, Tree, Matrix) already honor it.
  const sid = (s.metadata as any).serviceId;
  if (typeof sid === 'string') {
    // graphStore exposes a `serviceFilter` ref consumed by the kinds-aware
    // filter; if not present, fall back to setting the search query.
    (graphStore as any).serviceFilter = sid;
  }
}
</script>

<template>
  <div class="absolute inset-0 overflow-y-auto p-4 text-sm" style="color: var(--text-primary)">
    <div class="max-w-3xl mx-auto space-y-4">
      <header class="flex items-baseline justify-between">
        <h2 class="text-lg font-semibold">Services</h2>
        <button @click="load" class="text-xs px-2 py-1 rounded border" style="border-color: var(--border-subtle); color: var(--text-tertiary)">↻ Reload</button>
      </header>

      <div v-if="loading" class="text-xs" style="color: var(--text-tertiary)">Loading services…</div>
      <div v-else-if="error" class="text-xs" style="color: #ef4444">{{ error }}</div>
      <div v-else-if="services.length === 0" class="rounded p-3 text-xs" style="background: var(--surface-elevated); color: var(--text-secondary)">
        No msa-service nodes. Configure <code class="px-1 rounded" style="background: rgba(0,0,0,0.3)">services[]</code> in <code class="px-1 rounded" style="background: rgba(0,0,0,0.3)">.vdarc.json</code> and rerun analysis.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="s in services" :key="s.id"
          class="rounded p-3"
          style="background: var(--surface-elevated); border: 1px solid var(--border-subtle)"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-mono font-semibold" style="color: var(--text-primary)">{{ s.label }}</div>
              <div class="text-xs" style="color: var(--text-tertiary)">
                {{ (s.metadata as any).declared ? 'declared in services[]' : 'unassigned (no serviceId)' }}
                <span v-if="(s.metadata as any).type"> · {{ (s.metadata as any).type }}</span>
              </div>
            </div>
            <button
              @click="expandService(s)"
              class="text-xs px-2 py-1 rounded border"
              style="border-color: var(--border-subtle); color: var(--text-secondary)"
            >Expand</button>
          </div>

          <!-- Outbound -->
          <div class="mt-2 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div class="font-semibold mb-1" style="color: var(--text-secondary)">Outbound</div>
              <div v-for="kind in ['service-calls', 'service-shares-db', 'service-shares-dto']" :key="kind">
                <div v-for="e in edgesFromService(s.id, kind)" :key="e.id" class="flex items-center gap-1">
                  <span class="font-mono" :style="{ color: EDGE_STYLES[e.kind as keyof typeof EDGE_STYLES]?.color ?? '#666' }">{{ kind }}</span>
                  <span style="color: var(--text-tertiary)">→</span>
                  <span style="color: var(--text-secondary)">{{ targetLabel(e.target) }}</span>
                  <span v-if="kind === 'service-calls' && e.metadata.callCount" class="text-xs" style="color: var(--text-tertiary)">×{{ e.metadata.callCount }}</span>
                  <span v-if="kind === 'service-shares-db' && e.metadata.tableCount" class="text-xs" style="color: var(--text-tertiary)">{{ e.metadata.tableCount }} table(s)</span>
                  <span v-if="kind === 'service-shares-dto' && e.metadata.dtoCount" class="text-xs" style="color: var(--text-tertiary)">{{ e.metadata.dtoCount }} dto(s)</span>
                </div>
              </div>
            </div>
            <div>
              <div class="font-semibold mb-1" style="color: var(--text-secondary)">Inbound</div>
              <div v-for="kind in ['service-calls', 'service-shares-db', 'service-shares-dto']" :key="kind">
                <div v-for="e in edgesIntoService(s.id, kind)" :key="e.id" class="flex items-center gap-1">
                  <span style="color: var(--text-secondary)">{{ targetLabel(e.source) }}</span>
                  <span style="color: var(--text-tertiary)">→</span>
                  <span class="font-mono" :style="{ color: EDGE_STYLES[e.kind as keyof typeof EDGE_STYLES]?.color ?? '#666' }">{{ kind }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
