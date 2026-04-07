<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import ForceGraphView from '@/components/graph/ForceGraphView.vue';
import TreeView from '@/components/graph/TreeView.vue';
import NodeDetail from '@/components/graph/NodeDetail.vue';
import FilterPanel from '@/components/sidebar/FilterPanel.vue';
import SearchPanel from '@/components/sidebar/SearchPanel.vue';
import AnalysisProgress from '@/components/AnalysisProgress.vue';
import MiniMap from '@/components/graph/MiniMap.vue';

const graphStore = useGraphStore();
const activeView = ref<'graph' | 'tree'>('graph');
const sidebarTab = ref<'search' | 'filter'>('search');
const showDetail = ref(true);

// WebSocket state
const wsStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected');
const analyzing = ref(false);
const progress = ref({
  processed: 0,
  total: 0,
  currentFile: '',
  cachedCount: 0,
  elapsedMs: 0,
});

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout>;

onMounted(async () => {
  await graphStore.fetchGraph();
  loadHashState();
  connectWebSocket();
});

function connectWebSocket() {
  wsStatus.value = 'connecting';
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}/ws`);

  ws.onopen = () => {
    wsStatus.value = 'connected';
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case 'analysis:started':
        analyzing.value = true;
        progress.value = { processed: 0, total: msg.payload.totalFiles, currentFile: '', cachedCount: 0, elapsedMs: 0 };
        break;

      case 'analysis:progress':
        progress.value = msg.payload;
        break;

      case 'analysis:complete':
        analyzing.value = false;
        graphStore.fetchGraph();
        break;

      case 'graph:update':
        graphStore.fetchGraph();
        break;
    }
  };

  ws.onclose = () => {
    wsStatus.value = 'disconnected';
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

// URL hash state for shareable links
function loadHashState() {
  const hash = location.hash.slice(1);
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const nodeId = params.get('node');
  const view = params.get('view');
  if (nodeId) graphStore.selectNode(decodeURIComponent(nodeId));
  if (view === 'tree') activeView.value = 'tree';
}

watch(() => graphStore.selectedNodeId, (nodeId) => {
  const params = new URLSearchParams();
  if (nodeId) params.set('node', nodeId);
  params.set('view', activeView.value);
  history.replaceState(null, '', `#${params.toString()}`);
});

watch(activeView, (view) => {
  const params = new URLSearchParams(location.hash.slice(1));
  params.set('view', view);
  history.replaceState(null, '', `#${params.toString()}`);
});

function handleCancelAnalysis() {
  analyzing.value = false;
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    sidebarTab.value = 'search';
    // Focus search input
    const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
    input?.focus();
  }
  if (e.key === 'Escape') {
    graphStore.selectNode(null);
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="h-screen w-screen bg-gray-900 text-white flex flex-col overflow-hidden">
    <!-- Analysis Progress Overlay -->
    <AnalysisProgress
      v-if="analyzing"
      v-bind="progress"
      @cancel="handleCancelAnalysis"
    />

    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar -->
      <aside class="w-72 bg-gray-850 border-r border-gray-700 flex flex-col flex-shrink-0">
        <div class="p-3 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 class="text-lg font-bold text-green-400">VDA</h1>
            <p class="text-xs text-gray-500">Vue Dependency Analyzer</p>
          </div>
          <!-- Connection Status -->
          <div class="flex items-center gap-1.5">
            <span
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-green-500': wsStatus === 'connected',
                'bg-yellow-500 animate-pulse': wsStatus === 'connecting',
                'bg-red-500': wsStatus === 'disconnected',
              }"
            ></span>
            <span class="text-xs text-gray-500">{{ wsStatus }}</span>
          </div>
        </div>

        <!-- Sidebar Tabs -->
        <div class="flex border-b border-gray-700">
          <button
            @click="sidebarTab = 'search'"
            :class="sidebarTab === 'search' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500'"
            class="flex-1 px-3 py-2 text-sm"
          >
            Search
          </button>
          <button
            @click="sidebarTab = 'filter'"
            :class="sidebarTab === 'filter' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500'"
            class="flex-1 px-3 py-2 text-sm"
          >
            Filter
          </button>
        </div>

        <div class="flex-1 overflow-hidden">
          <SearchPanel v-if="sidebarTab === 'search'" />
          <FilterPanel v-else />
        </div>

        <!-- Stats Footer -->
        <div class="p-3 border-t border-gray-700 text-xs text-gray-500 space-y-0.5">
          <p>Nodes: {{ graphStore.filteredNodes.length }} / {{ graphStore.graphData?.nodes.length || 0 }}</p>
          <p>Edges: {{ graphStore.filteredEdges.length }} / {{ graphStore.graphData?.edges.length || 0 }}</p>
          <p v-if="graphStore.graphData">Files: {{ graphStore.graphData.metadata.fileCount }}</p>
          <p class="text-gray-600">Press <kbd class="bg-gray-700 px-1 rounded">/</kbd> to search, <kbd class="bg-gray-700 px-1 rounded">Esc</kbd> to deselect</p>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Toolbar -->
        <header class="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-3 gap-3 flex-shrink-0">
          <div class="flex gap-1">
            <button
              @click="activeView = 'graph'"
              :class="activeView === 'graph' ? 'bg-gray-600' : 'bg-gray-700'"
              class="px-3 py-1 rounded text-xs"
            >
              Graph
            </button>
            <button
              @click="activeView = 'tree'"
              :class="activeView === 'tree' ? 'bg-gray-600' : 'bg-gray-700'"
              class="px-3 py-1 rounded text-xs"
            >
              Tree
            </button>
          </div>

          <div class="flex-1"></div>

          <button
            @click="graphStore.triggerReanalyze()"
            :disabled="graphStore.loading || analyzing"
            class="px-3 py-1 rounded text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50"
          >
            {{ graphStore.loading || analyzing ? 'Analyzing...' : 'Re-analyze' }}
          </button>

          <button
            @click="showDetail = !showDetail"
            class="px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600"
          >
            {{ showDetail ? 'Hide' : 'Show' }} Detail
          </button>
        </header>

        <!-- Graph/Tree View -->
        <div class="flex-1 flex overflow-hidden">
          <div class="flex-1 relative">
            <div v-if="graphStore.loading && !analyzing" class="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
              <div class="text-gray-400">Loading graph...</div>
            </div>
            <div v-if="graphStore.error" class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <p class="text-red-400 text-sm mb-2">{{ graphStore.error }}</p>
                <button @click="graphStore.fetchGraph()" class="px-3 py-1 bg-gray-700 rounded text-sm">Retry</button>
              </div>
            </div>
            <ForceGraphView v-show="activeView === 'graph'" />
            <TreeView v-show="activeView === 'tree'" />
            <!-- MiniMap -->
            <div v-if="activeView === 'graph' && graphStore.filteredNodes.length > 50" class="absolute bottom-3 left-3 w-40 h-28">
              <MiniMap />
            </div>
          </div>

          <!-- Right Detail Panel -->
          <aside
            v-if="showDetail"
            class="w-80 border-l border-gray-700 bg-gray-850 flex-shrink-0"
          >
            <NodeDetail />
          </aside>
        </div>
      </main>
    </div>

    <!-- Status Bar -->
    <footer class="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-3 text-xs text-gray-500 gap-4 flex-shrink-0">
      <span v-if="graphStore.graphData">
        {{ graphStore.graphData.nodes.length }} nodes · {{ graphStore.graphData.edges.length }} edges · {{ graphStore.graphData.metadata.fileCount }} files
      </span>
      <span class="flex-1"></span>
      <span v-if="graphStore.graphData">
        Last analyzed: {{ new Date(graphStore.graphData.metadata.analyzedAt).toLocaleTimeString() }}
      </span>
    </footer>
  </div>
</template>

<style>
.bg-gray-850 {
  background-color: #1a1f2e;
}
</style>
