import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useSearchStore } from '@/stores/searchStore'
import { useClickOutside } from '@/composables/useClickOutside'
import axios from 'axios'

export function useUser() {
  const userStore = useUserStore()
  const searchStore = useSearchStore()
  const { clickOutside } = useClickOutside()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchUser(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.post('/api/users')
    return response.data
    const response = await axios.put(`/api/products/${id}`)
    return response.data
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
