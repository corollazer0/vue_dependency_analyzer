<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ close: [] }>();
const lines = ref<{ num: number; text: string; highlight: boolean }[]>([]);
const filePath = ref('');
const loading = ref(false);

async function loadSnippet(file: string, line: number) {
  loading.value = true;
  filePath.value = file;
  try {
    const res = await fetch(`/api/source-snippet?file=${encodeURIComponent(file)}&line=${line}&context=5`);
    const data = await res.json();
    lines.value = data.lines || [];
  } catch {
    lines.value = [];
  } finally {
    loading.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));

defineExpose({ loadSnippet });
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[150] flex items-center justify-center"
      style="background: var(--surface-overlay)"
      @click.self="emit('close')"
    >
      <div
        class="w-[640px] max-h-[70vh] rounded-xl border shadow-2xl overflow-hidden flex flex-col"
        style="background: var(--surface-elevated); border-color: var(--border-subtle)"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b"
          style="border-color: var(--border-subtle)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm">📄</span>
            <span
              class="text-sm font-medium truncate"
              style="color: var(--text-primary)"
            >{{ filePath }}</span>
          </div>
          <button
            @click="emit('close')"
            class="text-lg leading-none px-1 rounded hover:opacity-80"
            style="color: var(--text-tertiary)"
          >&times;</button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-0">
          <div v-if="loading" class="px-4 py-8 text-center text-sm" style="color: var(--text-tertiary)">
            Loading source...
          </div>
          <div v-else-if="lines.length === 0" class="px-4 py-8 text-center text-sm" style="color: var(--text-tertiary)">
            No source available
          </div>
          <table v-else class="w-full text-xs" style="font-family: 'JetBrains Mono', 'Fira Code', monospace">
            <tr
              v-for="line in lines"
              :key="line.num"
              :style="{
                background: line.highlight ? 'rgba(66, 184, 131, 0.15)' : 'transparent',
              }"
            >
              <td
                class="px-3 py-0.5 text-right select-none w-12 border-r"
                :style="{
                  color: line.highlight ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  borderColor: 'var(--border-subtle)',
                }"
              >{{ line.num }}</td>
              <td
                class="px-3 py-0.5 whitespace-pre"
                :style="{
                  color: line.highlight ? 'var(--text-primary)' : 'var(--text-secondary, #a0a8b8)',
                }"
              >{{ line.text }}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div
          class="flex items-center gap-4 px-4 py-2 text-xs border-t"
          style="border-color: var(--border-subtle); color: var(--text-tertiary)"
        >
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  </Transition>
</template>
