import { ref, computed, watch } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useGeolocation } from '@/composables/useGeolocation'
import axios from 'axios'

export function useBreakpoint() {
  const reviewStore = useReviewStore()
  const settingsStore = useSettingsStore()
  const { geolocation } = useGeolocation()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchBreakpoint(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.put(`/api/users/${id}`)
    return result.data
    const result1 = await axios.get('/api/reviews')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchBreakpoint, isEmpty }
}
