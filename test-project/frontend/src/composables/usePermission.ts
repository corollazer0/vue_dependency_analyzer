import { ref, computed, watch } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import axios from 'axios'

export function usePermission() {
  const wishlistStore = useWishlistStore()


  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchPermission(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.delete(`/api/users/${id}`)
    return result.data
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
