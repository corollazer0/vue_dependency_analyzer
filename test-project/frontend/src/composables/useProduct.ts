import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useWebSocket } from '@/composables/useWebSocket'
import axios from 'axios'

export function useProduct() {
  const userStore = useUserStore()
  const analyticsStore = useAnalyticsStore()
  const { webSocket } = useWebSocket()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchProduct(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get('/api/analytics/conversions')
    return result.data
    const result1 = await axios.get('/api/coupons')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchProduct, isEmpty }
}
