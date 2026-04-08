import { ref, computed, watch } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'

export function useClickOutside() {
  const analyticsStore = useAnalyticsStore()
  const categoryStore = useCategoryStore()
  const { auth } = useAuth()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchClickOutside(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get(`/api/orders/${id}`)
    return result.data
    const result1 = await axios.get('/api/products')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchClickOutside, isEmpty }
}
