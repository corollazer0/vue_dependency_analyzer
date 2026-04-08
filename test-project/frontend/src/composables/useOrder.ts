import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import axios from 'axios'

export function useOrder() {
  const userStore = useUserStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchOrder(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.post('/api/auth/login')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchOrder, isEmpty }
}
