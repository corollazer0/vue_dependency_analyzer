<template>
  <div class="order-orderPrint">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-brand />
    <order-history />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { useOrder } from '@/composables/useOrder'
import { useClickOutside } from '@/composables/useClickOutside'
import { products } from '@/api/products'
import axios from 'axios'
import ProductBrand from '@/components/product/ProductBrand.vue'
import OrderHistory from '@/components/order/OrderHistory.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'select'])

  const userStore = useUserStore()
  const cartStore = useCartStore()


  const order = useOrder()
  const clickOutside = useClickOutside()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/search')
    const response1 = await axios.get('/api/dashboard/stats')
    data.value = response1.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}




onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.order-orderPrint {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
