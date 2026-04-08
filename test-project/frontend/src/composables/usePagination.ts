import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uIStore'
import { useDragDrop } from '@/composables/useDragDrop'
import axios from 'axios'

export function usePagination() {
  const settingsStore = useSettingsStore()
  const uIStore = useUIStore()
  const { dragDrop } = useDragDrop()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchPagination(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.post('/api/products')
    return response.data
    const response = await axios.post(`/api/products/${id}/reviews`)
    return response.data
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
