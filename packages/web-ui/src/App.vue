<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import { useUiStore } from '@/stores/ui';
import ForceGraphView from '@/components/graph/ForceGraphView.vue';
import TreeView from '@/components/graph/TreeView.vue';
import NodeDetail from '@/components/graph/NodeDetail.vue';
import GraphLegend from '@/components/graph/GraphLegend.vue';
import FilterPanel from '@/components/sidebar/FilterPanel.vue';
import SearchPanel from '@/components/sidebar/SearchPanel.vue';
import AnalysisProgress from '@/components/AnalysisProgress.vue';
import OnboardingGuide from '@/components/OnboardingGuide.vue';
import CommandPalette from '@/components/CommandPalette.vue';
import ResizeHandle from '@/components/ui/ResizeHandle.vue';

const graphStore = useGraphStore();
const uiStore = useUiStore();
const activeView = ref<'graph' | 'tree'>('graph');
const sidebarTab = ref<'search' | 'filter'>('search');
const showSidebar = ref(true);

const wsStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected');
const analyzing = ref(false);
const progress = ref({ processed: 0, total: 0, currentFile: '', cachedCount: 0, elapsedMs: 0 });
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout>;

const appState = computed(() => {
  if (wsStatus.value === 'disconnected' && !graphStore.graphData) return 'disconnected';
  if (analyzing.value) return 'analyzing';
  if (graphStore.loading) return 'loading';
  if (!graphStore.graphData || graphStore.graphData.nodes.length === 0) return 'empty';
  return 'ready';
});

// Auto-open detail when node selected, keep open if manually toggled
function updateHash() {
  const params = new URLSearchParams();
  if (graphStore.selectedNodeId) params.set('node', graphStore.selectedNodeId);
  params.set('view', activeView.value);
  history.replaceState(null, '', `#${params.toString()}`);
}

watch(() => graphStore.selectedNodeId, (nodeId) => {
  if (nodeId) uiStore.showDetail = true;
  updateHash();
});

watch(activeView, () => updateHash());

onMounted(async () => {
  await graphStore.fetchGraph();
  loadHashState();
  connectWebSocket();
  document.addEventListener('keydown', handleKeydown);
});

function loadHashState() {
  const hash = location.hash.slice(1);
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const nodeId = params.get('node');
  if (nodeId) graphStore.selectNode(decodeURIComponent(nodeId));
  if (params.get('view') === 'tree') activeView.value = 'tree';
}

function connectWebSocket() {
  wsStatus.value = 'connecting';
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}/ws`);
  ws.onopen = () => { wsStatus.value = 'connected'; };
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'analysis:started') { analyzing.value = true; progress.value = { processed: 0, total: msg.payload.totalFiles, currentFile: '', cachedCount: 0, elapsedMs: 0 }; }
    else if (msg.type === 'analysis:progress') { progress.value = msg.payload; }
    else if (msg.type === 'analysis:complete') { analyzing.value = false; graphStore.fetchGraph(); }
    else if (msg.type === 'graph:update') { graphStore.fetchGraph(); }
  };
  ws.onclose = () => { wsStatus.value = 'disconnected'; clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connectWebSocket, 3000); };
  ws.onerror = () => { ws?.close(); };
}

function cancelAnalysis() {
  analyzing.value = false;
  fetch('/api/analyze/cancel', { method: 'POST' }).catch(() => {});
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !uiStore.showCommandPalette) graphStore.selectNode(null);
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden" style="background: var(--surface-primary); color: var(--text-primary)">
    <CommandPalette />
    <AnalysisProgress v-if="analyzing" v-bind="progress" @cancel="cancelAnalysis" />
    <OnboardingGuide v-if="appState === 'ready'" />

    <!-- Disconnected -->
    <div v-if="appState === 'disconnected'" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="text-4xl mb-4">🔌</div>
        <h2 class="text-lg font-semibold mb-2">Server not connected</h2>
        <p class="text-sm mb-4" style="color: var(--text-tertiary)">Make sure the VDA server is running</p>
        <code class="text-xs px-3 py-2 rounded-lg block mb-4" style="background: var(--surface-secondary); color: var(--accent-vue)">vda serve your-project --watch</code>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="appState === 'empty' && !analyzing" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="text-4xl mb-4">📊</div>
        <h2 class="text-lg font-semibold mb-2">No analysis data yet</h2>
        <button @click="graphStore.triggerReanalyze()" class="px-4 py-2 rounded-lg text-sm font-medium" style="background: var(--accent-vue); color: var(--text-inverse)">Analyze Now</button>
      </div>
    </div>

    <!-- Main Layout -->
    <template v-else-if="appState === 'ready' || appState === 'loading'">
      <div class="flex-1 flex overflow-hidden">

        <!-- Left Sidebar -->
        <aside
          v-if="showSidebar"
          role="complementary"
          aria-label="Search and filter"
          class="flex flex-col flex-shrink-0 border-r"
          :style="{ width: uiStore.sidebarWidth + 'px' }"
          style="background: var(--surface-secondary); border-color: var(--border-subtle)"
        >
          <!-- Header with close button -->
          <div class="p-3 border-b flex items-center justify-between" style="border-color: var(--border-subtle)">
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold" style="color: var(--accent-vue)">VDA</h1>
              <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: wsStatus === 'connected' ? 'var(--accent-vue)' : wsStatus === 'connecting' ? 'var(--accent-warning)' : 'var(--accent-danger)' }" :class="wsStatus === 'connecting' ? 'animate-pulse' : ''"></span>
            </div>
            <button @click="showSidebar = false" class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors" style="color: var(--text-tertiary)" title="Close sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="flex border-b" style="border-color: var(--border-subtle)">
            <button v-for="tab in [{id:'search',label:'Search'},{id:'filter',label:'Filter'}]" :key="tab.id" @click="sidebarTab = tab.id as any" class="flex-1 px-3 py-2 text-sm border-b-2 transition-colors" :style="{ color: sidebarTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)', borderColor: sidebarTab === tab.id ? 'var(--accent-blue)' : 'transparent' }">{{ tab.label }}</button>
          </div>

          <!-- Content — Bug #4: overflow-y-auto so long filter lists are scrollable -->
          <div class="flex-1 overflow-y-auto">
            <SearchPanel v-if="sidebarTab === 'search'" />
            <FilterPanel v-else />
          </div>

          <!-- Stats -->
          <div class="p-3 border-t text-xs" style="border-color: var(--border-subtle); color: var(--text-tertiary)">
            <span style="color: var(--text-secondary)">{{ graphStore.filteredNodes.length }}</span> / {{ graphStore.graphData?.nodes.length || 0 }} nodes ·
            <span style="color: var(--text-secondary)">{{ graphStore.filteredEdges.length }}</span> / {{ graphStore.graphData?.edges.length || 0 }} edges
          </div>
        </aside>

        <!-- Sidebar resize handle -->
        <ResizeHandle v-if="showSidebar" v-model="uiStore.sidebarWidth" :min="200" :max="400" />

        <!-- Main area -->
        <main role="main" class="flex-1 flex flex-col overflow-hidden">
          <!-- Toolbar -->
          <header role="navigation" aria-label="Toolbar" class="h-10 flex items-center px-3 gap-2 flex-shrink-0 border-b" style="background: var(--surface-secondary); border-color: var(--border-subtle)">
            <!-- Open sidebar button (visible when sidebar is closed) -->
            <button v-if="!showSidebar" @click="showSidebar = true" class="w-8 h-8 flex items-center justify-center rounded-md transition-colors border" style="background: var(--surface-elevated); color: var(--text-primary); border-color: var(--border-default)" title="Open sidebar (☰)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>

            <!-- View switcher -->
            <button v-for="view in [{id:'graph',label:'Graph'},{id:'tree',label:'Tree'}]" :key="view.id" @click="activeView = view.id as any" class="px-3 py-1 rounded-md text-xs transition-colors" :style="{ background: activeView === view.id ? 'var(--accent-blue)' : 'var(--surface-elevated)', color: activeView === view.id ? '#fff' : 'var(--text-secondary)' }">{{ view.label }}</button>

            <div class="flex-1"></div>

            <span class="text-xs hidden sm:inline" style="color: var(--text-tertiary)"><kbd class="px-1 rounded" style="background: var(--surface-elevated)">⌘K</kbd></span>

            <button @click="graphStore.triggerReanalyze()" :disabled="graphStore.loading || analyzing" class="px-3 py-1 rounded-md text-xs font-medium disabled:opacity-40" style="background: var(--accent-vue); color: var(--text-inverse)">{{ graphStore.loading || analyzing ? 'Analyzing...' : 'Re-analyze' }}</button>
          </header>

          <!-- Views + Detail -->
          <div class="flex-1 flex overflow-hidden">
            <!-- Graph/Tree -->
            <div class="flex-1 relative">
              <div v-if="graphStore.loading && !analyzing" class="absolute inset-0 flex items-center justify-center z-10" style="background: var(--surface-overlay)">
                <div class="flex items-center gap-2" style="color: var(--text-secondary)">
                  <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>Loading...
                </div>
              </div>
              <ForceGraphView v-show="activeView === 'graph'" />
              <TreeView v-show="activeView === 'tree'" />
              <GraphLegend v-if="activeView === 'graph'" />
            </div>

            <!-- Right Detail Panel — always open when showDetail, with close button inside -->
            <template v-if="uiStore.showDetail">
              <ResizeHandle v-model="uiStore.detailWidth" :min="280" :max="500" />
              <aside role="complementary" aria-label="Node detail" :style="{ width: uiStore.detailWidth + 'px' }" style="background: var(--surface-secondary)" class="flex-shrink-0 flex flex-col">
                <!-- Detail header with close -->
                <div class="h-10 flex items-center px-3 border-b" style="border-color: var(--border-subtle)">
                  <span class="text-xs font-medium" style="color: var(--text-secondary)">Detail</span>
                  <div class="flex-1"></div>
                  <button @click="uiStore.showDetail = false" class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors" style="color: var(--text-tertiary)" title="Close detail panel">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div class="flex-1 overflow-y-auto">
                  <NodeDetail />
                </div>
              </aside>
            </template>
          </div>
        </main>
      </div>

      <!-- Status Bar -->
      <footer class="h-6 flex items-center px-3 text-xs gap-4 flex-shrink-0 border-t" style="background: var(--surface-secondary); border-color: var(--border-subtle); color: var(--text-tertiary)">
        <span v-if="graphStore.graphData">{{ graphStore.graphData.metadata.fileCount }} files</span>
        <span class="flex-1"></span>
        <span v-if="graphStore.graphData">{{ new Date(graphStore.graphData.metadata.analyzedAt).toLocaleTimeString() }}</span>
      </footer>
    </template>
  </div>
</template>
