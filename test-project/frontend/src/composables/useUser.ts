import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useOrderStore } from '@/stores/orderStore'
import { useKeyboard } from '@/composables/useKeyboard'
import axios from 'axios'

export function useUser() {
  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const { keyboard } = useKeyboard()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchUser(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.post('/api/auth/refresh')
    return result.data
    const result1 = await axios.get('/api/users')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchUser, isEmpty }
}
