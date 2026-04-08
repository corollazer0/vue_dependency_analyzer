import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref<any[]>([])
  const selectedItem = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const count = computed(() => items.value.length)
  const hasError = computed(() => !!error.value)

  async function action0(id?: string) {
    loading.value = true
    try {
      const response = await axios.get('/api/notifications')
      items.value = response.data
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function action1(id?: string) {
    loading.value = true
    try {
      const response = await axios.get(`/api/products/${id}`)
      items.value = response.data
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function action2(id?: string) {
    loading.value = true
    try {
      const response = await axios.put(`/api/orders/${id}/status`)
      items.value = response.data
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  function reset() {
    items.value = []
    selectedItem.value = null
    error.value = null
  }

  return { items, selectedItem, loading, error, count, hasError, action0, action1, action2, reset }
})
