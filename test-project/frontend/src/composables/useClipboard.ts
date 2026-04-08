import { ref, computed, watch } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import axios from 'axios'

export function useClipboard() {
  const analyticsStore = useAnalyticsStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchClipboard(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get(`/api/orders/${id}`)
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchClipboard, isEmpty }
}
