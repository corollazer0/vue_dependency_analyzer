<template>
  <div class="common-basePagination">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <radar-chart />
    <order-payment />
    <product-review />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useDragDrop } from '@/composables/useDragDrop'
import { useThrottle } from '@/composables/useThrottle'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import RadarChart from '@/components/dashboard/RadarChart.vue'
import OrderPayment from '@/components/order/OrderPayment.vue'
import ProductReview from '@/components/product/ProductReview.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const userStore = useUserStore()
  const wishlistStore = useWishlistStore()


  const dragDrop = useDragDrop()
  const throttle = useThrottle()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/wishlist')
    const response1 = await axios.post('/api/orders')
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
.common-basePagination {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
