<template>
  <div class="dashboard-dashboardChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-recommendation />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useProduct } from '@/composables/useProduct'
import { useWebSocket } from '@/composables/useWebSocket'
import { formatCurrency } from '@/utils/formatCurrency'
import axios from 'axios'
import ProductRecommendation from '@/components/product/ProductRecommendation.vue'

const props = defineProps({
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

  const userStore = useUserStore()
  const analyticsStore = useAnalyticsStore()


  const product = useProduct()
  const webSocket = useWebSocket()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/coupons/validate')
    const response1 = await axios.get('/api/users')
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
.dashboard-dashboardChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
