import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import axios from 'axios'

export function useFilter() {
  const uIStore = useUIStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchFilter(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get('/api/cart')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchFilter, isEmpty }
}
