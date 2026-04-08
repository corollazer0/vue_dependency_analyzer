<script setup lang="ts">
import { useUiStore } from '@/stores/ui';

const uiStore = useUiStore();

const tips = [
  { icon: '👆', title: 'Click nodes', desc: 'Click any node to see its dependencies and details' },
  { icon: '👆👆', title: 'Double-click clusters', desc: 'Expand grouped nodes by double-clicking them' },
  { icon: '⌨️', title: 'Quick search', desc: 'Press / or Cmd+K to search for any file or component' },
  { icon: '🔍', title: 'Filter by type', desc: 'Use the Filter panel or Legend to show specific dependency types' },
];

function dismiss() {
  uiStore.dismissOnboarding();
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="!uiStore.onboardingDismissed"
      class="absolute inset-0 z-[100] flex items-center justify-center"
      style="background: var(--surface-overlay)"
      @click.self="dismiss"
      @keydown.escape="dismiss"
    >
      <div
        class="rounded-xl p-6 w-[420px] border shadow-2xl"
        style="background: var(--surface-elevated); border-color: var(--border-subtle)"
      >
        <h2 class="text-lg font-bold mb-1" style="color: var(--text-primary)">
          Welcome to VDA
        </h2>
        <p class="text-sm mb-5" style="color: var(--text-tertiary)">
          Vue Dependency Analyzer — explore your project's dependency graph
        </p>

        <div class="space-y-3 mb-6">
          <div
            v-for="tip in tips"
            :key="tip.title"
            class="flex items-start gap-3 p-3 rounded-lg"
            style="background: var(--surface-secondary)"
          >
            <span class="text-xl flex-shrink-0">{{ tip.icon }}</span>
            <div>
              <div class="text-sm font-medium" style="color: var(--text-primary)">{{ tip.title }}</div>
              <div class="text-xs mt-0.5" style="color: var(--text-tertiary)">{{ tip.desc }}</div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 text-xs cursor-pointer" style="color: var(--text-tertiary)">
            <input type="checkbox" @change="dismiss" class="rounded" />
            Don't show again
          </label>
          <button
            @click="dismiss"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style="background: var(--accent-vue); color: var(--text-inverse)"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
