<script setup lang="ts">
import { ref } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import { apiFetch } from '@/api/client';

const emit = defineEmits<{ close: [] }>();
const graphStore = useGraphStore();

const filesInput = ref('');
const loading = ref(false);
const result = ref<any>(null);

async function analyzeImpact() {
  const files = filesInput.value.split('\n').map(f => f.trim()).filter(Boolean);
  if (files.length === 0) return;

  loading.value = true;
  result.value = null;
  try {
    const res = await apiFetch('/api/analysis/change-impact', {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
    const data = await res.json();
    result.value = data;

    // Set impact overlay on graph
    graphStore.impactNodeIds = {
      changed: new Set((data.changedNodes || []).map((n: any) => n.id)),
      direct: new Set((data.directImpact || []).map((n: any) => n.id)),
      transitive: new Set((data.transitiveImpact || []).map((n: any) => n.id)),
    };
  } catch {
    result.value = { error: 'Failed to analyze impact' };
  } finally {
    loading.value = false;
  }
}

function clearImpact() {
  result.value = null;
  graphStore.impactNodeIds = { changed: new Set(), direct: new Set(), transitive: new Set() };
}

function navigateTo(nodeId: string) {
  graphStore.focusNode(nodeId);
}
</script>

<template>
  <div
    class="absolute inset-0 z-30 flex items-start justify-center pt-16"
    style="background: var(--surface-overlay)"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-xl rounded-lg shadow-2xl overflow-hidden"
      style="background: var(--surface-elevated); border: 1px solid var(--border-default)"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: var(--border-subtle)">
        <h2 class="text-sm font-semibold" style="color: var(--text-primary)">Change Impact Analysis</h2>
        <div class="flex items-center gap-2">
          <button @click="clearImpact" class="px-2 py-1 text-xs rounded hover:bg-white/5" style="color: var(--text-tertiary)">Clear</button>
          <button @click="emit('close')" class="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10" style="color: var(--text-tertiary)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div class="p-4 space-y-3">
        <div>
          <label class="block text-xs mb-1" style="color: var(--text-tertiary)">Changed files (one per line, relative to project root)</label>
          <textarea
            v-model="filesInput"
            rows="4"
            class="w-full rounded px-3 py-2 text-xs font-mono focus:outline-none"
            style="background: var(--surface-primary); border: 1px solid var(--border-default); color: var(--text-primary)"
            placeholder="frontend/src/components/auth/LoginPage.vue&#10;backend/user-service/src/main/java/UserService.java"
          ></textarea>
        </div>

        <button
          @click="analyzeImpact"
          :disabled="!filesInput.trim() || loading"
          class="w-full py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40"
          style="background: var(--accent-blue); color: #fff"
        >
          <span v-if="loading">Analyzing...</span>
          <span v-else>Analyze Impact</span>
        </button>

        <div v-if="result && !result.error" class="space-y-2">
          <div class="grid grid-cols-5 gap-2 text-center">
            <div class="rounded p-2" style="background: rgba(239,68,68,0.15)">
              <div class="text-lg font-bold" style="color: #ef4444">{{ result.summary?.changed || 0 }}</div>
              <div class="text-xs" style="color: var(--text-tertiary)">Changed</div>
            </div>
            <div class="rounded p-2" style="background: rgba(249,115,22,0.15)">
              <div class="text-lg font-bold" style="color: #f97316">{{ result.summary?.direct || 0 }}</div>
              <div class="text-xs" style="color: var(--text-tertiary)">Direct</div>
            </div>
            <div class="rounded p-2" style="background: rgba(234,179,8,0.15)">
              <div class="text-lg font-bold" style="color: #eab308">{{ result.summary?.transitive || 0 }}</div>
              <div class="text-xs" style="color: var(--text-tertiary)">Transitive</div>
            </div>
            <div class="rounded p-2" style="background: rgba(66,184,131,0.15)">
              <div class="text-lg font-bold" style="color: #42b883">{{ result.summary?.endpoints || 0 }}</div>
              <div class="text-xs" style="color: var(--text-tertiary)">Endpoints</div>
            </div>
            <div class="rounded p-2" style="background: rgba(0,188,212,0.15)">
              <div class="text-lg font-bold" style="color: #00bcd4">{{ result.summary?.tables || 0 }}</div>
              <div class="text-xs" style="color: var(--text-tertiary)">Tables</div>
            </div>
          </div>

          <div v-if="result.changedNodes?.length" class="max-h-40 overflow-y-auto space-y-1">
            <div class="text-xs font-semibold" style="color: #ef4444">Changed nodes:</div>
            <button
              v-for="n in result.changedNodes" :key="n.id"
              @click="navigateTo(n.id)"
              class="block w-full text-left text-xs px-2 py-1 rounded hover:bg-white/5"
              style="color: var(--text-secondary)"
            >{{ n.label }} <span style="color: var(--text-tertiary)">({{ n.kind }})</span></button>
          </div>

          <div v-if="result.affectedEndpoints?.length" class="max-h-32 overflow-y-auto space-y-1">
            <div class="text-xs font-semibold" style="color: #42b883">Affected endpoints:</div>
            <button
              v-for="n in result.affectedEndpoints" :key="n.id"
              @click="navigateTo(n.id)"
              class="block w-full text-left text-xs px-2 py-1 rounded hover:bg-white/5"
              style="color: var(--text-secondary)"
            >{{ n.label }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
