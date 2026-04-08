import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import axios from 'axios'

export function useAuth() {
  const authStore = useAuthStore()
  const { token, user, isLoggedIn } = storeToRefs(authStore)
  const router = useRouter()
  async function login(email: string, password: string) {
    const res = await axios.post('/api/auth/login', { email, password })
    authStore.login()
    router.push('/dashboard')
  }
  async function logout() {
    await axios.post('/api/auth/logout')
    authStore.logout()
    router.push('/login')
  }
  return { token, user, isLoggedIn, login, logout }
}
