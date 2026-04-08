import { ref, computed, watch } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useProductStore } from '@/stores/productStore'
import { useNotification } from '@/composables/useNotification'
import axios from 'axios'

export function useSearch() {
  const reviewStore = useReviewStore()
  const productStore = useProductStore()
  const { notification } = useNotification()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchSearch(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get('/api/settings')
    return response.data
    const response = await axios.get('/api/analytics/traffic')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchSearch, isEmpty }
}
