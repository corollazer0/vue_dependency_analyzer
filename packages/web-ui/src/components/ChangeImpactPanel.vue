<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGraphStore } from '@/stores/graphStore';
import { apiFetch } from '@/api/client';

const emit = defineEmits<{ close: [] }>();
const graphStore = useGraphStore();

// Phase 7a-3 — Impact UX rebuild.
//
// Inputs in priority order:
//   (A) Git: uncommitted (HEAD vs working tree) or last-N-commits
//       (HEAD~N..HEAD). Default mode — populates files in 1 click +
//       Analyze in 1 more = 2 clicks from open.
//   (B) Manual textarea — collapsed under "Advanced" so the typed-paths
//       failure mode the user reported in Phase 7 doesn't block the
//       happy path.
type Mode = 'git' | 'manual';
const mode = ref<Mode>('git');
const filesInput = ref('');
const showAdvanced = ref(false);
const loading = ref(false);
const result = ref<any>(null);

// Git source state
type GitSource = 'uncommitted' | 'range';
const gitSource = ref<GitSource>('uncommitted');
const lastN = ref(1);
const gitFiles = ref<string[]>([]);
const gitMessage = ref<string | null>(null);
const gitLoading = ref(false);

async function loadGitUncommitted() {
  gitLoading.value = true;
  gitMessage.value = null;
  try {
    const res = await apiFetch('/api/git/uncommitted');
    const data = await res.json();
    if (!res.ok) {
      gitFiles.value = [];
      gitMessage.value = data.error || 'Git unavailable';
    } else {
      gitFiles.value = data.files || [];
      gitMessage.value = gitFiles.value.length === 0 ? 'No uncommitted changes.' : null;
    }
  } catch (e: any) {
    gitFiles.value = [];
    gitMessage.value = e?.message || 'Git request failed';
  } finally {
    gitLoading.value = false;
  }
}

async function loadGitRange() {
  gitLoading.value = true;
  gitMessage.value = null;
  const n = Math.max(1, Math.min(50, lastN.value | 0));
  try {
    const res = await apiFetch(`/api/git/range?from=HEAD~${n}&to=HEAD`);
    const data = await res.json();
    if (!res.ok) {
      gitFiles.value = [];
      gitMessage.value = data.error || 'Git unavailable';
    } else {
      gitFiles.value = data.files || [];
      gitMessage.value = gitFiles.value.length === 0
        ? `No file changes in last ${n} commit(s).`
        : null;
    }
  } catch (e: any) {
    gitFiles.value = [];
    gitMessage.value = e?.message || 'Git request failed';
  } finally {
    gitLoading.value = false;
  }
}

function refreshGit() {
  if (gitSource.value === 'uncommitted') return loadGitUncommitted();
  return loadGitRange();
}

onMounted(() => {
  // Default-load uncommitted so the first click on Analyze just works.
  refreshGit();
});

function activeFiles(): string[] {
  if (mode.value === 'git') return gitFiles.value.slice();
  return filesInput.value.split('\n').map(f => f.trim()).filter(Boolean);
}

async function analyzeImpact() {
  const files = activeFiles();
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
        <!-- Mode tabs (Phase 7a-3) -->
        <div role="tablist" aria-label="Impact input source" class="inline-flex w-full rounded-md overflow-hidden text-xs"
             style="border: 1px solid var(--border-subtle)">
          <button
            role="tab" :aria-selected="mode === 'git'"
            @click="mode = 'git'"
            class="flex-1 px-3 py-1.5 transition-colors"
            :style="{
              background: mode === 'git' ? 'var(--accent-blue)' : 'transparent',
              color: mode === 'git' ? '#fff' : 'var(--text-tertiary)'
            }"
          >Git</button>
          <button
            role="tab" :aria-selected="mode === 'manual'"
            @click="mode = 'manual'; showAdvanced = true"
            class="flex-1 px-3 py-1.5 transition-colors"
            :style="{
              background: mode === 'manual' ? 'var(--accent-blue)' : 'transparent',
              color: mode === 'manual' ? '#fff' : 'var(--text-tertiary)'
            }"
          >Manual paths</button>
        </div>

        <!-- Git mode -->
        <div v-if="mode === 'git'" class="space-y-2">
          <div class="flex items-center gap-2 text-xs">
            <label class="flex items-center gap-1 cursor-pointer" style="color: var(--text-secondary)">
              <input type="radio" v-model="gitSource" value="uncommitted" @change="refreshGit" />
              Uncommitted
            </label>
            <label class="flex items-center gap-1 cursor-pointer" style="color: var(--text-secondary)">
              <input type="radio" v-model="gitSource" value="range" @change="refreshGit" />
              Last
              <input
                type="number"
                v-model.number="lastN"
                :min="1" :max="50"
                @change="gitSource === 'range' && refreshGit()"
                class="w-12 rounded px-1 py-0.5"
                style="background: var(--surface-primary); border: 1px solid var(--border-default); color: var(--text-primary)"
              />
              commits
            </label>
            <button
              @click="refreshGit"
              class="ml-auto px-2 py-0.5 rounded hover:bg-white/5"
              style="color: var(--text-tertiary)"
              :disabled="gitLoading"
              aria-label="Reload git changes"
              title="Reload"
            >↻</button>
          </div>
          <div
            class="rounded text-xs max-h-40 overflow-y-auto"
            style="background: var(--surface-primary); border: 1px solid var(--border-subtle)"
          >
            <div v-if="gitLoading" class="px-3 py-3 text-center" style="color: var(--text-tertiary)">Loading…</div>
            <div v-else-if="gitMessage" class="px-3 py-3 text-center" style="color: var(--text-tertiary)">{{ gitMessage }}</div>
            <ul v-else class="font-mono">
              <li v-for="f in gitFiles" :key="f" class="px-3 py-1 truncate" style="color: var(--text-secondary)">{{ f }}</li>
            </ul>
          </div>
          <p v-if="!gitLoading && !gitMessage && gitFiles.length > 0" class="text-xs"
             style="color: var(--text-tertiary)">
            {{ gitFiles.length }} file{{ gitFiles.length === 1 ? '' : 's' }} ready — click Analyze.
          </p>
        </div>

        <!-- Manual mode (advanced) -->
        <div v-if="mode === 'manual' || showAdvanced">
          <button
            v-if="mode !== 'manual'"
            @click="showAdvanced = !showAdvanced"
            class="w-full text-left text-xs py-1 transition-colors"
            style="color: var(--text-tertiary)"
            :aria-expanded="showAdvanced"
          >{{ showAdvanced ? '▾' : '▸' }} Advanced — type paths manually</button>
          <div v-if="showAdvanced || mode === 'manual'" class="mt-1">
            <label class="block text-xs mb-1" style="color: var(--text-tertiary)">
              Changed files (one per line, relative to project root)
            </label>
            <textarea
              v-model="filesInput"
              rows="4"
              class="w-full rounded px-3 py-2 text-xs font-mono focus:outline-none"
              style="background: var(--surface-primary); border: 1px solid var(--border-default); color: var(--text-primary)"
              placeholder="frontend/src/components/auth/LoginPage.vue&#10;backend/user-service/src/main/java/UserService.java"
              aria-label="Manual file path list"
            ></textarea>
          </div>
        </div>

        <button
          @click="analyzeImpact"
          :disabled="activeFiles().length === 0 || loading"
          class="w-full py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40"
          style="background: var(--accent-blue); color: #fff"
        >
          <span v-if="loading">Analyzing...</span>
          <span v-else>Analyze Impact ({{ activeFiles().length }} file{{ activeFiles().length === 1 ? '' : 's' }})</span>
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
