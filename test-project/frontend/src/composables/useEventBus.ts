import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'

export function useEventBus() {
  const userStore = useUserStore()
  const reviewStore = useReviewStore()
  const { cart } = useCart()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchEventBus(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.put(`/api/products/${id}`)
    return response.data
    const response = await axios.post(`/api/orders/${id}/cancel`)
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchEventBus, isEmpty }
}
