import { ref, computed, watch } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useSearchStore } from '@/stores/searchStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'

export function useBreakpoint() {
  const categoryStore = useCategoryStore()
  const searchStore = useSearchStore()
  const { cart } = useCart()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchBreakpoint(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.post(`/api/orders/${id}/cancel`)
    return response.data
    const response = await axios.get('/api/users')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchBreakpoint, isEmpty }
}
