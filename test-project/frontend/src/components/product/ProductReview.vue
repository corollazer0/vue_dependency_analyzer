<template>
  <div class="product-productReview">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-receipt />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useSearch } from '@/composables/useSearch'
import { useDebounce } from '@/composables/useDebounce'
import { storage } from '@/services/storage'
import axios from 'axios'
import OrderReceipt from '@/components/order/OrderReceipt.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'update'])

  const authStore = useAuthStore()
  const cartStore = useCartStore()
  const search = useSearch()
  const debounce = useDebounce()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/auth/login')
    const response = await axios.put(`/api/notifications/${id}/read`)
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.product-productReview {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
