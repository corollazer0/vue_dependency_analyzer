import { ref, computed, watch } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useCartStore } from '@/stores/cartStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'

export function useDragDrop() {
  const uIStore = useUIStore()
  const cartStore = useCartStore()
  const { product } = useProduct()

  const data = ref(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchDragDrop(id?: string) {
    loading.value = true
    error.value = null
    try {
    const result = await axios.post('/api/orders')
    return result.data
    const result1 = await axios.get('/api/orders')
    return result1.data
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  const isEmpty = computed(() => !data.value)

  return { data, loading, error, fetchDragDrop, isEmpty }
}
