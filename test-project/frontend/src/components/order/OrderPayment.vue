<template>
  <div class="order-orderPayment">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <two-factor-setup />
    <product-grid />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useFetch } from '@/composables/useFetch'
import { useThrottle } from '@/composables/useThrottle'
import { throttle } from '@/utils/throttle'
import axios from 'axios'
import TwoFactorSetup from '@/components/auth/TwoFactorSetup.vue'
import ProductGrid from '@/components/product/ProductGrid.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update', 'select'])

  const orderStore = useOrderStore()
  const inventoryStore = useInventoryStore()


  const fetch = useFetch()
  const throttle = useThrottle()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${props.id}`)
    const response1 = await axios.post('/api/products')
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
.order-orderPayment {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
