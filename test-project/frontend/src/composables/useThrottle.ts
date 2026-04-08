import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useProductStore } from '@/stores/productStore'
import { useNotification } from '@/composables/useNotification'
import axios from 'axios'

export function useThrottle() {
  const settingsStore = useSettingsStore()
  const productStore = useProductStore()
  const { notification } = useNotification()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchThrottle(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get(`/api/orders/${id}`)
    return response.data
    const response = await axios.get(`/api/products/${id}`)
    return response.data
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
