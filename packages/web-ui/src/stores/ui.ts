import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const sidebarWidth = ref(parseInt(localStorage.getItem('vda-sidebar-width') || '288', 10));
  const detailWidth = ref(parseInt(localStorage.getItem('vda-detail-width') || '320', 10));
  const showDetail = ref(true);
  const showCommandPalette = ref(false);
  const onboardingDismissed = ref(localStorage.getItem('vda-onboarding-dismissed') === 'true');
  const legendExpanded = ref(false);

  function setSidebarWidth(w: number) {
    sidebarWidth.value = Math.max(200, Math.min(400, w));
    localStorage.setItem('vda-sidebar-width', String(sidebarWidth.value));
  }

  function setDetailWidth(w: number) {
    detailWidth.value = Math.max(280, Math.min(500, w));
    localStorage.setItem('vda-detail-width', String(detailWidth.value));
  }

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
    setSidebarWidth,
    setDetailWidth,
    dismissOnboarding,
  };
});
