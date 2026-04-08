import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'

export function useDarkMode() {
  const userStore = useUserStore()
  const inventoryStore = useInventoryStore()
  const { auth } = useAuth()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchDarkMode(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get('/api/users')
    return response.data
    const response = await axios.get(`/api/users/${id}`)
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchDarkMode, isEmpty }
}
