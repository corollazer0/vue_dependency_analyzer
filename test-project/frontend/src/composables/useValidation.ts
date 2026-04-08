import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useOrderStore } from '@/stores/orderStore'
import { useDebounce } from '@/composables/useDebounce'
import axios from 'axios'

export function useValidation() {
  const uIStore = useUIStore()
  const orderStore = useOrderStore()
  const { debounce } = useDebounce()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchValidation(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.put(`/api/users/${id}`)
    return response.data
    const response = await axios.post('/api/coupons/validate')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchValidation, isEmpty }
}
