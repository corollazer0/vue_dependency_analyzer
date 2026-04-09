<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const mismatches = ref<any[]>([]);
const loading = ref(false);
const show = ref(false);

async function loadMismatches() {
  loading.value = true;
  try {
    const res = await fetch('/api/analysis/dto-consistency');
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
              <tr
                v-for="(item, i) in mismatches"
                :key="i"
                class="border-b hover:opacity-90"
                :style="{
                  borderColor: 'var(--border-subtle)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }"
              >
                <td class="px-3 py-2" style="color: var(--text-primary)">
                  <span class="font-mono">{{ item.endpointPath }}</span>
                </td>
                <td class="px-3 py-2" style="color: var(--text-secondary, #a0a8b8)">{{ item.backendDto }}</td>
                <td class="px-3 py-2" style="color: var(--text-secondary, #a0a8b8)">{{ item.frontendInterface }}</td>
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
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div
          class="flex items-center justify-between px-4 py-2 text-xs border-t"
          style="border-color: var(--border-subtle); color: var(--text-tertiary)"
        >
          <span>{{ mismatches.length }} endpoint(s) with mismatches</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  </Transition>
</template>
