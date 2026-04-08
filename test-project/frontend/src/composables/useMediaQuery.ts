import { ref, computed, watch } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import axios from 'axios'

export function useMediaQuery() {
  const orderStore = useOrderStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchMediaQuery(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.post('/api/auth/refresh')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchMediaQuery, isEmpty }
}
