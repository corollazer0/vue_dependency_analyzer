<template>
  <div class="dashboard-dashboardChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-tracking />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useUserStore } from '@/stores/userStore'
import { useDebounce } from '@/composables/useDebounce'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { users } from '@/api/users'
import axios from 'axios'
import OrderTracking from '@/components/order/OrderTracking.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['select', 'submit'])

  const categoryStore = useCategoryStore()
  const userStore = useUserStore()
  const debounce = useDebounce()
  const infiniteScroll = useInfiniteScroll()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}/reviews`)
    const response = await axios.post(`/api/orders/${id}/cancel`)
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
.dashboard-dashboardChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
