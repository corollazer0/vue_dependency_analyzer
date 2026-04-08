<template>
  <div class="auth-resetPassword">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-search />
    <order-detail />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useThrottle } from '@/composables/useThrottle'
import { usePagination } from '@/composables/usePagination'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import ProductSearch from '@/components/product/ProductSearch.vue'
import OrderDetail from '@/components/order/OrderDetail.vue'

const props = defineProps({
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const analyticsStore = useAnalyticsStore()
  const wishlistStore = useWishlistStore()


  const throttle = useThrottle()
  const pagination = usePagination()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/products')
    const response1 = await axios.put(`/api/users/${props.id}`)
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
.auth-resetPassword {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
