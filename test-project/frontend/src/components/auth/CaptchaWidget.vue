<template>
  <div class="auth-captchaWidget">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-wishlist />
    <confirm-dialog />
    <order-stats />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useOrder } from '@/composables/useOrder'
import { useDragDrop } from '@/composables/useDragDrop'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ProductWishlist from '@/components/product/ProductWishlist.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import OrderStats from '@/components/order/OrderStats.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const wishlistStore = useWishlistStore()
  const analyticsStore = useAnalyticsStore()


  const order = useOrder()
  const dragDrop = useDragDrop()

  const configValue = inject('config')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.delete(`/api/cart/items/${props.id}`)
    const response1 = await axios.get(`/api/orders/${props.id}`)
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
.auth-captchaWidget {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
