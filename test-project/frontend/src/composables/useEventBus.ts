import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useThrottle } from '@/composables/useThrottle'
import axios from 'axios'

export function useEventBus() {
  const settingsStore = useSettingsStore()
  const inventoryStore = useInventoryStore()
  const { throttle } = useThrottle()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchEventBus(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.delete(`/api/wishlist/${id}`)
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

  return { data, loading, error, fetchEventBus, isEmpty }
}
