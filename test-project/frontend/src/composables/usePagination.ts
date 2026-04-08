import { ref, computed, watch } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useNotification } from '@/composables/useNotification'
import axios from 'axios'

export function usePagination() {
  const notificationStore = useNotificationStore()
  const settingsStore = useSettingsStore()
  const { notification } = useNotification()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchPagination(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get('/api/products')
    return result.data
    const result1 = await axios.get('/api/users')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchPagination, isEmpty }
}
