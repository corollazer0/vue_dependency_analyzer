import { ref, computed, watch } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import axios from 'axios'

export function useOrder() {
  const cartStore = useCartStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchOrder(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get(`/api/users/${id}`)
    return result.data
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
