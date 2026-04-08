import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

export function useApi() {
  const authStore = useAuthStore()
  const client = axios.create({ baseURL: '/api' })
  client.interceptors.request.use(config => {
    if (authStore.token) config.headers.Authorization = 'Bearer ' + authStore.token
    return config
  })
  return { client }
}
