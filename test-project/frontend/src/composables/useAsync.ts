import { ref, computed, watch } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useFilter } from '@/composables/useFilter'
import axios from 'axios'

export function useAsync() {
  const orderStore = useOrderStore()
  const notificationStore = useNotificationStore()
  const { filter } = useFilter()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchAsync(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.put(`/api/orders/${id}/status`)
    return result.data
    const result1 = await axios.put(`/api/users/${id}`)
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchAsync, isEmpty }
}
