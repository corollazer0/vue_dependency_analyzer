import { ref, computed, watch } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useOrder } from '@/composables/useOrder'
import axios from 'axios'

export function useGeolocation() {
  const wishlistStore = useWishlistStore()
  const settingsStore = useSettingsStore()
  const { order } = useOrder()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchGeolocation(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.post('/api/orders')
    return result.data
    const result1 = await axios.put(`/api/orders/${id}/status`)
    return result1.data
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
