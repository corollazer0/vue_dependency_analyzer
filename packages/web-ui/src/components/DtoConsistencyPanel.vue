<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { apiFetch } from '@/api/client';
import SourceSnippet from './graph/SourceSnippet.vue';

const mismatches = ref<any[]>([]);
const loading = ref(false);
const show = ref(false);
const expandedRows = ref<Set<number>>(new Set());
const showSnippet = ref(false);
const snippetRef = ref<InstanceType<typeof SourceSnippet>>();

function toggleRow(i: number) {
  if (expandedRows.value.has(i)) expandedRows.value.delete(i);
  else expandedRows.value.add(i);
}

function shortPath(p?: string): string {
  if (!p) return '';
  const parts = p.split('/');
  return parts.length <= 3 ? p : `…/${parts.slice(-2).join('/')}`;
}

function openSource(ref: { filePath?: string; line?: number } | undefined, e?: Event) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  if (!ref?.filePath) return;
  showSnippet.value = true;
  snippetRef.value?.loadSnippet(ref.filePath, ref.line ?? 1);
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'warning': return '#f97316';
    default: return '#6b7280';
  }
}

function issueLabel(issue: string): string {
  switch (issue) {
    case 'missing-frontend': return 'Missing in frontend';
    case 'missing-backend': return 'Extra in frontend';
    case 'type-mismatch': return 'Type mismatch';
    default: return issue;
  }
}

async function loadMismatches() {
  loading.value = true;
  try {
    const res = await apiFetch('/api/analysis/dto-consistency');
    const data = await res.json();
    mismatches.value = data.mismatches || data || [];
  } catch {
    mismatches.value = [];
  } finally {
    loading.value = false;
  }
}

function open() {
  show.value = true;
  loadMismatches();
}

function close() {
  show.value = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && show.value) {
    close();
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));

function handleEvent() {
  open();
}

onMounted(() => document.addEventListener('vda:show-dto-mismatches', handleEvent));
onUnmounted(() => document.removeEventListener('vda:show-dto-mismatches', handleEvent));

defineExpose({ open, close });
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[200] flex items-center justify-center"
      style="background: var(--surface-overlay)"
      @click.self="close"
    >
      <div
        class="w-[800px] max-h-[75vh] rounded-xl border shadow-2xl overflow-hidden flex flex-col"
        style="background: var(--surface-elevated); border-color: var(--border-subtle)"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b"
          style="border-color: var(--border-subtle)"
        >
          <h2 class="text-sm font-bold" style="color: var(--text-primary)">DTO Consistency Report</h2>
          <button
            @click="close"
            class="text-lg leading-none px-1 rounded hover:opacity-80"
            style="color: var(--text-tertiary)"
          >&times;</button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto">
          <div v-if="loading" class="px-4 py-8 text-center text-sm" style="color: var(--text-tertiary)">
            Loading DTO consistency data...
          </div>
          <div v-else-if="mismatches.length === 0" class="px-4 py-8 text-center text-sm" style="color: var(--text-tertiary)">
            No DTO mismatches found. Everything is consistent!
          </div>
          <table v-else class="w-full text-xs">
            <thead>
              <tr class="border-b" style="border-color: var(--border-subtle)">
                <th class="px-3 py-2 text-left font-semibold" style="color: var(--text-secondary, #a0a8b8)">Endpoint</th>
                <th class="px-3 py-2 text-left font-semibold" style="color: var(--text-secondary, #a0a8b8)">Backend DTO</th>
                <th class="px-3 py-2 text-left font-semibold" style="color: var(--text-secondary, #a0a8b8)">Frontend Interface</th>
                <th class="px-3 py-2 text-left font-semibold" style="color: #ef4444">Missing in Frontend</th>
                <th class="px-3 py-2 text-left font-semibold" style="color: #f97316">Missing in Backend</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(item, i) in mismatches" :key="i">
                <tr
                  class="border-b hover:opacity-90 cursor-pointer"
                  :style="{
                    borderColor: 'var(--border-subtle)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }"
                  @click="toggleRow(i)"
                >
                  <td class="px-3 py-2" style="color: var(--text-primary)">
                    <span class="mr-1">{{ expandedRows.has(i) ? '▾' : '▸' }}</span>
                    <span class="font-mono">{{ item.endpointPath }}</span>
                  </td>
                  <td class="px-3 py-2" style="color: var(--text-secondary, #a0a8b8)">
                    <div>{{ item.backendDto }}</div>
                    <button
                      v-if="item.backendSource?.filePath"
                      type="button"
                      class="text-[10px] font-mono underline decoration-dotted hover:opacity-80"
                      style="color: var(--text-tertiary)"
                      :title="`Open ${item.backendSource.filePath}${item.backendSource.line ? ':' + item.backendSource.line : ''}`"
                      @click="openSource(item.backendSource, $event)"
                    >{{ shortPath(item.backendSource.filePath) }}<span v-if="item.backendSource.line">:{{ item.backendSource.line }}</span></button>
                  </td>
                  <td class="px-3 py-2" style="color: var(--text-secondary, #a0a8b8)">
                    <div>{{ item.frontendInterface || '—' }}</div>
                    <button
                      v-if="item.frontendSource?.filePath"
                      type="button"
                      class="text-[10px] font-mono underline decoration-dotted hover:opacity-80"
                      style="color: var(--text-tertiary)"
                      :title="`Open ${item.frontendSource.filePath}${item.frontendSource.line ? ':' + item.frontendSource.line : ''}`"
                      @click="openSource(item.frontendSource, $event)"
                    >{{ shortPath(item.frontendSource.filePath) }}<span v-if="item.frontendSource.line">:{{ item.frontendSource.line }}</span></button>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      v-for="field in (item.missingInFrontend || [])"
                      :key="field"
                      class="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded text-xs"
                      style="background: rgba(239, 68, 68, 0.15); color: #ef4444"
                    >{{ field }}</span>
                    <span v-if="!item.missingInFrontend?.length" style="color: var(--text-tertiary)">-</span>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      v-for="field in (item.missingInBackend || [])"
                      :key="field"
                      class="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded text-xs"
                      style="background: rgba(249, 115, 22, 0.15); color: #f97316"
                    >{{ field }}</span>
                    <span v-if="!item.missingInBackend?.length" style="color: var(--text-tertiary)">-</span>
                  </td>
                </tr>
                <!-- Field Details (expanded) -->
                <tr v-if="expandedRows.has(i) && item.fieldDetails?.length > 0">
                  <td colspan="5" class="px-6 py-2" style="background: rgba(0,0,0,0.15)">
                    <div class="space-y-1">
                      <div
                        v-for="fd in item.fieldDetails"
                        :key="fd.name"
                        class="flex items-center gap-3 text-xs py-0.5"
                      >
                        <span
                          class="w-2 h-2 rounded-full flex-shrink-0"
                          :style="{ backgroundColor: severityColor(fd.severity) }"
                        ></span>
                        <span class="font-mono font-medium w-36" style="color: var(--text-primary)">{{ fd.name }}</span>
                        <span class="w-20 text-right" style="color: var(--text-tertiary)">{{ fd.backendType || '—' }}</span>
                        <span style="color: var(--text-tertiary)">→</span>
                        <span class="w-20" style="color: var(--text-tertiary)">{{ fd.frontendType || '—' }}</span>
                        <span
                          class="px-1.5 py-0.5 rounded"
                          :style="{ color: severityColor(fd.severity), background: severityColor(fd.severity) + '20' }"
                        >{{ issueLabel(fd.issue) }}</span>
                        <span v-if="fd.optional" class="text-xs" style="color: var(--text-tertiary)">optional</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div
          class="flex items-center justify-between px-4 py-2 text-xs border-t"
          style="border-color: var(--border-subtle); color: var(--text-tertiary)"
        >
          <span>{{ mismatches.length }} DTO mismatch(es)</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  </Transition>

  <SourceSnippet ref="snippetRef" :show="showSnippet" @close="showSnippet = false" />
</template>
