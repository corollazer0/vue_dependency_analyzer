import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readStoredNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return fallback;

    return clamp(parsed, min, max);
  } catch {
    return fallback;
  }
}

function readStoredBoolean(key: string, fallback = false): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

export const useUiStore = defineStore('ui', () => {
  const sidebarWidth = ref(readStoredNumber('vda-sidebar-width', 288, 200, 400));
  const detailWidth = ref(readStoredNumber('vda-detail-width', 320, 280, 500));
  const showDetail = ref(true);
  const showCommandPalette = ref(false);
  const onboardingDismissed = ref(readStoredBoolean('vda-onboarding-dismissed'));
  const legendExpanded = ref(false);

  // Auto-persist widths when changed (handles both setter and v-model direct writes)
  watch(sidebarWidth, (w) => {
    const clamped = clamp(w, 200, 400);
    if (clamped !== w) sidebarWidth.value = clamped;
    try {
      localStorage.setItem('vda-sidebar-width', String(clamped));
    } catch {
      // Ignore storage failures and keep the in-memory state usable.
    }
  });

  watch(detailWidth, (w) => {
    const clamped = clamp(w, 280, 500);
    if (clamped !== w) detailWidth.value = clamped;
    try {
      localStorage.setItem('vda-detail-width', String(clamped));
    } catch {
      // Ignore storage failures and keep the in-memory state usable.
    }
  });

  function dismissOnboarding() {
    onboardingDismissed.value = true;
    try {
      localStorage.setItem('vda-onboarding-dismissed', 'true');
    } catch {
      // Ignore storage failures and keep the in-memory state usable.
    }
  }

  return {
    sidebarWidth,
    detailWidth,
    showDetail,
    showCommandPalette,
    onboardingDismissed,
    legendExpanded,
    dismissOnboarding,
  };
});
