<template>
  <div class="order-orderFeedback">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <line-chart />
    <order-search />
    <order-shipping />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useOrderStore } from '@/stores/orderStore'
import { useAuth } from '@/composables/useAuth'
import { useGeolocation } from '@/composables/useGeolocation'
import { logger } from '@/services/logger'
import axios from 'axios'
import LineChart from '@/components/dashboard/LineChart.vue'
import OrderSearch from '@/components/order/OrderSearch.vue'
import OrderShipping from '@/components/order/OrderShipping.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const inventoryStore = useInventoryStore()
  const orderStore = useOrderStore()
  const auth = useAuth()
  const geolocation = useGeolocation()

  const eventBusValue = inject('eventBus')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/auth/register')
    const response = await axios.get('/api/dashboard/stats')
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
.order-orderFeedback {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
