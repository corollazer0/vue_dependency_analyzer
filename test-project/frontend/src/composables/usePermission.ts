import { ref, computed, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import axios from 'axios'

export function usePermission() {
  const inventoryStore = useInventoryStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchPermission(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.delete(`/api/products/${id}`)
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchPermission, isEmpty }
}
