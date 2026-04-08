import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const sidebarWidth = ref(parseInt(localStorage.getItem('vda-sidebar-width') || '288', 10));
  const detailWidth = ref(parseInt(localStorage.getItem('vda-detail-width') || '320', 10));
  const showDetail = ref(true);
  const showCommandPalette = ref(false);
  const onboardingDismissed = ref(localStorage.getItem('vda-onboarding-dismissed') === 'true');
  const legendExpanded = ref(false);

  // Auto-persist widths when changed (handles both setter and v-model direct writes)
  watch(sidebarWidth, (w) => {
    const clamped = Math.max(200, Math.min(400, w));
    if (clamped !== w) sidebarWidth.value = clamped;
    localStorage.setItem('vda-sidebar-width', String(clamped));
  });

  watch(detailWidth, (w) => {
    const clamped = Math.max(280, Math.min(500, w));
    if (clamped !== w) detailWidth.value = clamped;
    localStorage.setItem('vda-detail-width', String(clamped));
  });

  function dismissOnboarding() {
    onboardingDismissed.value = true;
    localStorage.setItem('vda-onboarding-dismissed', 'true');
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
