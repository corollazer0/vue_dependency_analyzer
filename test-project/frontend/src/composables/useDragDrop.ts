import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useTheme } from '@/composables/useTheme'
import axios from 'axios'

export function useDragDrop() {
  const userStore = useUserStore()
  const inventoryStore = useInventoryStore()
  const { theme } = useTheme()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchDragDrop(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.delete(`/api/wishlist/${id}`)
    return response.data
    const response = await axios.delete(`/api/users/${id}`)
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchDragDrop, isEmpty }
}
