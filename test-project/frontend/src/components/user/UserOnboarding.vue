<template>
  <div class="user-userOnboarding">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-wishlist />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useProductStore } from '@/stores/productStore'
import { useAuth } from '@/composables/useAuth'
import { useThrottle } from '@/composables/useThrottle'
import { products } from '@/api/products'
import axios from 'axios'
import ProductWishlist from '@/components/product/ProductWishlist.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const orderStore = useOrderStore()
  const productStore = useProductStore()
  const auth = useAuth()
  const throttle = useThrottle()

  const eventBusValue = inject('eventBus')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/orders')
    const response = await axios.get('/api/settings')
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
.user-userOnboarding {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
