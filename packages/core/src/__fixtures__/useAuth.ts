import { ref, computed } from 'vue'
import { useUserStore } from './stores/userStore'
import axios from 'axios'

export function useAuth() {
  const userStore = useUserStore()
  const isLoggedIn = computed(() => !!userStore.token)

  async function login(email: string, password: string) {
    const res = await axios.post('/api/auth/login', { email, password })
    userStore.setToken(res.data.token)
  }

  async function logout() {
    await axios.post('/api/auth/logout')
    userStore.clearToken()
  }

  return { isLoggedIn, login, logout }
}
