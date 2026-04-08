<template>
  <div class="auth-twoFactorSetup">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <security-log />
    <product-wishlist />
    <order-review />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useDragDrop } from '@/composables/useDragDrop'
import axios from 'axios'
import SecurityLog from '@/components/auth/SecurityLog.vue'
import ProductWishlist from '@/components/product/ProductWishlist.vue'
import OrderReview from '@/components/order/OrderReview.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const notificationStore = useNotificationStore()
  const dragDrop = useDragDrop()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/auth/login')
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
.auth-twoFactorSetup {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
