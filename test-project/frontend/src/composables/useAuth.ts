import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import axios from 'axios'

export function useAuth() {
  const userStore = useUserStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchAuth(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get(`/api/products/${id}/reviews`)
    return result.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchAuth, isEmpty }
}
