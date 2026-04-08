import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { useDragDrop } from '@/composables/useDragDrop'
import axios from 'axios'

export function useGeolocation() {
  const userStore = useUserStore()
  const cartStore = useCartStore()
  const { dragDrop } = useDragDrop()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchGeolocation(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get('/api/dashboard/stats')
    return response.data
    const response = await axios.delete(`/api/users/${id}`)
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchGeolocation, isEmpty }
}
