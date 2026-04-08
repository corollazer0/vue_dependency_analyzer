<template>
  <div class="auth-apiKeyManager">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-delivery />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useWebSocket } from '@/composables/useWebSocket'
import { useValidation } from '@/composables/useValidation'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import OrderDelivery from '@/components/order/OrderDelivery.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const productStore = useProductStore()
  const analyticsStore = useAnalyticsStore()
  const webSocket = useWebSocket()
  const validation = useValidation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}`)
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
.auth-apiKeyManager {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
