import { ref, computed, watch } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useDebounce } from '@/composables/useDebounce'
import axios from 'axios'

export function useClickOutside() {
  const couponStore = useCouponStore()
  const categoryStore = useCategoryStore()
  const { debounce } = useDebounce()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchClickOutside(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.post('/api/auth/refresh')
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

  return { data, loading, error, fetchClickOutside, isEmpty }
}
