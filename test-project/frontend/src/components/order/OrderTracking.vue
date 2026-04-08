<template>
  <div class="order-orderTracking">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <mini-chart />
    <activity-feed />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useDebounce } from '@/composables/useDebounce'
import { useProduct } from '@/composables/useProduct'
import { users } from '@/api/users'
import axios from 'axios'
import MiniChart from '@/components/dashboard/MiniChart.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'select'])

  const orderStore = useOrderStore()
  const analyticsStore = useAnalyticsStore()


  const debounce = useDebounce()
  const product = useProduct()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/products')
    const response1 = await axios.post('/api/users')
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
.order-orderTracking {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
