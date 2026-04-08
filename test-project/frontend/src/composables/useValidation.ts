import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import axios from 'axios'

export function useValidation() {
  const userStore = useUserStore()
  const cartStore = useCartStore()
  const { localStorage } = useLocalStorage()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchValidation(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get('/api/categories')
    return result.data
    const result1 = await axios.get('/api/search')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchValidation, isEmpty }
}
