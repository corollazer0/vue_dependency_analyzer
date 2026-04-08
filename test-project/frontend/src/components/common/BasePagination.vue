<template>
  <div class="common-basePagination">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <session-timeout />
    <traffic-chart />
    <trend-indicator />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { usePermission } from '@/composables/usePermission'
import { useGeolocation } from '@/composables/useGeolocation'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import SessionTimeout from '@/components/auth/SessionTimeout.vue'
import TrafficChart from '@/components/dashboard/TrafficChart.vue'
import TrendIndicator from '@/components/dashboard/TrendIndicator.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const authStore = useAuthStore()
  const cartStore = useCartStore()
  const permission = usePermission()
  const geolocation = useGeolocation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/users/${id}`)
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
.common-basePagination {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
