<template>
  <div class="order-orderItem">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <activity-feed />
    <order-detail />
    <product-upload />
    </div>
    <button @click="emit('remove')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orderStore'
import { useProductStore } from '@/stores/productStore'
import { useOrder } from '@/composables/useOrder'
import { useProduct } from '@/composables/useProduct'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import OrderDetail from '@/components/order/OrderDetail.vue'
import ProductUpload from '@/components/product/ProductUpload.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['remove', 'update-quantity'])

  const orderStore = useOrderStore()
  const productStore = useProductStore()

  const router = useRouter()
  const order = useOrder()
  const product = useProduct()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/logout')
    const response1 = await axios.get('/api/users')
    data.value = response1.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}


  function goToOrder(orderId: number) { router.push(`/orders/${orderId}`) }

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.order-orderItem {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
