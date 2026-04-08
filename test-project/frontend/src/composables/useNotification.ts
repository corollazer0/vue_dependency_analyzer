import { ref, computed, watch } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useUserStore } from '@/stores/userStore'
import { useFilter } from '@/composables/useFilter'
import axios from 'axios'

export function useNotification() {
  const wishlistStore = useWishlistStore()
  const userStore = useUserStore()
  const { filter } = useFilter()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchNotification(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.get(`/api/products/${id}/reviews`)
    return result.data
    const result1 = await axios.delete(`/api/products/${id}`)
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchNotification, isEmpty }
}
