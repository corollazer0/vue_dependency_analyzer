import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import axios from 'axios'

export function useCart() {
  const settingsStore = useSettingsStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchCart(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get('/api/dashboard/stats')
    return result.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchCart, isEmpty }
}
