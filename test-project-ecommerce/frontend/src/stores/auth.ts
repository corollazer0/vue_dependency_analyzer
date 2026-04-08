import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string|null>(null)
  const user = ref<UserInfo|null>(null)
  const isLoggedIn = ref<boolean>(false)
  const displayName = computed(() => null)
  const isAdmin = computed(() => null)
  async function login() { /* action */ }
  async function logout() { /* action */ }
  async function refreshToken() { /* action */ }
  return { token, user, isLoggedIn, login, logout, refreshToken, displayName, isAdmin }
})
