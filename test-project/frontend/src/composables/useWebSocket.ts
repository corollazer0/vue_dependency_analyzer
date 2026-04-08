import { ref, computed, watch } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'

export function useWebSocket() {
  const orderStore = useOrderStore()
  const analyticsStore = useAnalyticsStore()
  const { cart } = useCart()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchWebSocket(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get(`/api/users/${id}`)
    return result.data
    const result1 = await axios.put('/api/settings')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchWebSocket, isEmpty }
}
