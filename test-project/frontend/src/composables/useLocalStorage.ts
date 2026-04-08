import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'

export function useLocalStorage() {
  const authStore = useAuthStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchLocalStorage(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get('/api/notifications')
    return result.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchLocalStorage, isEmpty }
}
