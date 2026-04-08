<template>
  <div class="product-productCarousel">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <dashboard-filter />
    <order-tracking />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUserStore } from '@/stores/userStore'
import { usePagination } from '@/composables/usePagination'
import { useWebSocket } from '@/composables/useWebSocket'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import DashboardFilter from '@/components/dashboard/DashboardFilter.vue'
import OrderTracking from '@/components/order/OrderTracking.vue'

const props = defineProps({
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update', 'change'])

  const settingsStore = useSettingsStore()
  const userStore = useUserStore()


  const pagination = usePagination()
  const webSocket = useWebSocket()

  const localeValue = inject('locale')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/dashboard/stats')
    const response1 = await axios.post('/api/wishlist')
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
.product-productCarousel {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
