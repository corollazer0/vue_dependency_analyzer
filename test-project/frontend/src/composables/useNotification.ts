import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useOrderStore } from '@/stores/orderStore'
import { useDragDrop } from '@/composables/useDragDrop'
import axios from 'axios'

export function useNotification() {
  const authStore = useAuthStore()
  const orderStore = useOrderStore()
  const { dragDrop } = useDragDrop()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchNotification(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.post(`/api/orders/${id}/cancel`)
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

  return { data, loading, error, fetchNotification, isEmpty }
}
