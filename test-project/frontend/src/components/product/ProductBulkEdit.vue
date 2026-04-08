<template>
  <div class="product-productBulkEdit">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-delivery />
    <order-print />
    <auth-callback />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'
import OrderDelivery from '@/components/order/OrderDelivery.vue'
import OrderPrint from '@/components/order/OrderPrint.vue'
import AuthCallback from '@/components/auth/AuthCallback.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const wishlistStore = useWishlistStore()
  const permission = usePermission()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}`)
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
.product-productBulkEdit {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
