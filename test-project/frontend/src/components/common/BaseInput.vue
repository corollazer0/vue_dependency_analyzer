<template>
  <div class="common-baseInput">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-analytics />
    <order-tracking />
    <user-stats />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { usePagination } from '@/composables/usePagination'
import { useThrottle } from '@/composables/useThrottle'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import ProductAnalytics from '@/components/product/ProductAnalytics.vue'
import OrderTracking from '@/components/order/OrderTracking.vue'
import UserStats from '@/components/user/UserStats.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const wishlistStore = useWishlistStore()
  const inventoryStore = useInventoryStore()


  const pagination = usePagination()
  const throttle = useThrottle()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put('/api/settings')
    const response1 = await axios.get('/api/settings')
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
.common-baseInput {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
