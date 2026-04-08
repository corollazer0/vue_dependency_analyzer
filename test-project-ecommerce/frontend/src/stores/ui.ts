import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref<boolean>(false)
  const theme = ref<string>("dark")
  const locale = ref<string>("ko")

  async function toggleSidebar() { /* action */ }
  async function setTheme() { /* action */ }
  async function setLocale() { /* action */ }
  return { sidebarCollapsed, theme, locale, toggleSidebar, setTheme, setLocale }
})
