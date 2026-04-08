import { ref, computed, watch } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useUIStore } from '@/stores/uIStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'

export function useThrottle() {
  const orderStore = useOrderStore()
  const uIStore = useUIStore()
  const { permission } = usePermission()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchThrottle(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.put(`/api/orders/${id}/status`)
    return result.data
    const result1 = await axios.get(`/api/products/${id}`)
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchThrottle, isEmpty }
}
