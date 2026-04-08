import { ref, computed, watch } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import axios from 'axios'

export function useWebSocket() {
  const analyticsStore = useAnalyticsStore()
  const wishlistStore = useWishlistStore()
  const { localStorage } = useLocalStorage()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchWebSocket(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get('/api/users')
    return response.data
    const response = await axios.get('/api/categories')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchWebSocket, isEmpty }
}
