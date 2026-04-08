import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'

export function useAuth() {
  const authStore = useAuthStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchAuth(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.post('/api/auth/logout')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchAuth, isEmpty }
}
