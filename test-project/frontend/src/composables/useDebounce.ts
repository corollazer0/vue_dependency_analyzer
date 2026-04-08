import { ref, computed, watch } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import axios from 'axios'

export function useDebounce() {
  const reviewStore = useReviewStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchDebounce(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get('/api/dashboard/revenue')
    return result.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchDebounce, isEmpty }
}
