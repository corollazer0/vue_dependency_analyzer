import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useProductStore } from '@/stores/productStore'
import { useNotification } from '@/composables/useNotification'
import axios from 'axios'

export function useProduct() {
  const uIStore = useUIStore()
  const productStore = useProductStore()
  const { notification } = useNotification()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchProduct(id?: string) {
    loading.value = true
    error.value = null
    try {
    const response = await axios.get('/api/notifications')
    return response.data
    const response = await axios.put('/api/settings')
    return response.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchProduct, isEmpty }
}
