import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useThrottle } from '@/composables/useThrottle'
import axios from 'axios'

export function useSearch() {
  const userStore = useUserStore()
  const inventoryStore = useInventoryStore()
  const { throttle } = useThrottle()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchSearch(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.post('/api/coupons/validate')
    return result.data
    const result1 = await axios.post('/api/users')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchSearch, isEmpty }
}
