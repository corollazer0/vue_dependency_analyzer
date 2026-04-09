<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import { useUiStore } from '@/stores/ui';
import type { SearchResult } from '@/types/graph';
import { NODE_STYLES } from '@/types/graph';

const graphStore = useGraphStore();
const uiStore = useUiStore();
const query = ref('');
const selectedIndex = ref(0);
const inputRef = ref<HTMLInputElement>();
const results = ref<PaletteItem[]>([]);
let searchDebounce: ReturnType<typeof setTimeout>;

interface PaletteItem {
  id: string;
  label: string;
  kind: string;
  type: 'node' | 'command';
  action: () => void;
  icon?: string;
  color?: string;
}

const commands: PaletteItem[] = [
  { id: 'cmd:reanalyze', label: 'Re-analyze project', kind: 'Command', type: 'command', icon: '🔄', action: () => graphStore.triggerReanalyze() },
  { id: 'cmd:fit', label: 'Fit graph to view', kind: 'Command', type: 'command', icon: '⊡', action: () => { document.dispatchEvent(new CustomEvent('vda:fit-graph')); } },
  { id: 'cmd:export', label: 'Export as JSON', kind: 'Command', type: 'command', icon: '📦', action: () => exportAsJson() },
  { id: 'cmd:reset', label: 'Reset all filters', kind: 'Command', type: 'command', icon: '↺', action: () => graphStore.resetFilters() },
  { id: 'cmd:export-png', label: 'Export graph as PNG', kind: 'Command', type: 'command', icon: '📷', action: () => { document.dispatchEvent(new CustomEvent('vda:export-graph-png')); } },
  { id: 'cmd:dto-mismatches', label: 'Show DTO mismatches', kind: 'Command', type: 'command', icon: '🔍', action: () => { document.dispatchEvent(new CustomEvent('vda:show-dto-mismatches')); } },
];

const recentItems = computed(() => {
  const stored = localStorage.getItem('vda-recent-commands');
  if (!stored) return [];
  try {
    return JSON.parse(stored) as string[];
  } catch { return []; }
});

function addToRecent(id: string) {
  const recent = recentItems.value.filter(r => r !== id).slice(0, 4);
  recent.unshift(id);
  localStorage.setItem('vda-recent-commands', JSON.stringify(recent));
}

watch(query, (q) => {
  clearTimeout(searchDebounce);
  selectedIndex.value = 0;

  if (!q.trim()) {
    results.value = commands;
    return;
  }

  // Search commands
  const matchedCommands = commands.filter(c =>
    fuzzyMatch(c.label, q)
  );

  // Search nodes (debounced)
  searchDebounce = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const nodeResults: PaletteItem[] = (data.results as SearchResult[]).slice(0, 15).map(r => ({
        id: r.nodeId,
        label: r.label,
        kind: r.kind,
        type: 'node' as const,
        color: NODE_STYLES[r.kind]?.color,
        action: () => {
          graphStore.selectNode(r.nodeId);
        },
      }));
      results.value = [...matchedCommands, ...nodeResults];
    } catch {
      results.value = matchedCommands;
    }
  }, 150);

  results.value = matchedCommands;
});

function fuzzyMatch(text: string, pattern: string): boolean {
  const lower = text.toLowerCase();
  const p = pattern.toLowerCase();
  return lower.includes(p) || lower.split(' ').some(w => w.startsWith(p));
}

function selectItem(item: PaletteItem) {
  addToRecent(item.id);
  item.action();
  close();
}

function close() {
  uiStore.showCommandPalette = false;
  query.value = '';
  results.value = commands;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
  } else if (e.key === 'Enter' && results.value[selectedIndex.value]) {
    selectItem(results.value[selectedIndex.value]);
  } else if (e.key === 'Escape') {
    close();
  }
}

function exportAsJson() {
  const data = JSON.stringify(graphStore.graphData, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vda-graph.json';
  a.click();
  URL.revokeObjectURL(url);
}

function resetFilters() {
  // Reset all node/edge kinds to active
  window.location.reload();
}

watch(() => uiStore.showCommandPalette, (show) => {
  if (show) {
    results.value = commands;
    nextTick(() => inputRef.value?.focus());
  }
});

// Global keyboard listener
function globalKeyHandler(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    uiStore.showCommandPalette = !uiStore.showCommandPalette;
  }
  if (e.key === '/' && !uiStore.showCommandPalette && !(e.target instanceof HTMLInputElement)) {
    e.preventDefault();
    uiStore.showCommandPalette = true;
  }
}

onMounted(() => document.addEventListener('keydown', globalKeyHandler));
onUnmounted(() => document.removeEventListener('keydown', globalKeyHandler));
</script>

<template>
  <Transition name="fade">
    <div
      v-if="uiStore.showCommandPalette"
      class="fixed inset-0 z-[200] flex justify-center pt-[15vh]"
      style="background: var(--surface-overlay)"
      @click.self="close"
    >
      <div
        class="w-[520px] max-h-[60vh] rounded-xl border shadow-2xl overflow-hidden flex flex-col"
        style="background: var(--surface-elevated); border-color: var(--border-subtle)"
        @keydown="handleKeydown"
      >
        <!-- Search input -->
        <div class="flex items-center gap-3 px-4 py-3 border-b" style="border-color: var(--border-subtle)">
          <span style="color: var(--text-tertiary)">⌘</span>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Search nodes, run commands..."
            class="flex-1 bg-transparent text-sm outline-none"
            style="color: var(--text-primary)"
          />
          <kbd class="px-1.5 py-0.5 rounded text-xs" style="background: var(--surface-secondary); color: var(--text-tertiary)">ESC</kbd>
        </div>

        <!-- Results -->
        <div class="flex-1 overflow-y-auto py-1">
          <div
            v-for="(item, i) in results"
            :key="item.id"
            @click="selectItem(item)"
            @mouseenter="selectedIndex = i"
            class="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
            :style="{
              background: i === selectedIndex ? 'rgba(255,255,255,0.05)' : 'transparent',
            }"
          >
            <span v-if="item.icon" class="text-base w-5 text-center">{{ item.icon }}</span>
            <span
              v-else
              class="w-3 h-3 rounded-sm flex-shrink-0"
              :style="{ backgroundColor: item.color || '#666' }"
            ></span>
            <span class="text-sm flex-1 truncate" style="color: var(--text-primary)">{{ item.label }}</span>
            <span class="text-xs" style="color: var(--text-tertiary)">{{ item.kind }}</span>
          </div>

          <div v-if="results.length === 0" class="px-4 py-6 text-center text-sm" style="color: var(--text-tertiary)">
            No results found
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center gap-4 px-4 py-2 text-xs border-t" style="border-color: var(--border-subtle); color: var(--text-tertiary)">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  </Transition>
</template>
