import { ref, computed, watch } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import axios from 'axios'

export function useForm() {
  const reviewStore = useReviewStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchForm(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get('/api/categories')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchForm, isEmpty }
}
