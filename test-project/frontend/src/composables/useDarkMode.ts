import { ref, computed, watch } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useValidation } from '@/composables/useValidation'
import axios from 'axios'

export function useDarkMode() {
  const productStore = useProductStore()
  const notificationStore = useNotificationStore()
  const { validation } = useValidation()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchDarkMode(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get('/api/users')
    return result.data
    const result1 = await axios.get('/api/orders')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchDarkMode, isEmpty }
}
