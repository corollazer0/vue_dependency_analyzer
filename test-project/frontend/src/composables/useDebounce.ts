import { ref, computed, watch } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import axios from 'axios'

export function useDebounce() {
  const couponStore = useCouponStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchDebounce(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get('/api/products')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchDebounce, isEmpty }
}
