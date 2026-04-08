import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useUser } from '@/composables/useUser'
import axios from 'axios'

export function useAsync() {
  const settingsStore = useSettingsStore()
  const analyticsStore = useAnalyticsStore()
  const { user } = useUser()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchAsync(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.post('/api/auth/register')
    return response.data
    const response = await axios.put('/api/settings')
    return response.data
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
