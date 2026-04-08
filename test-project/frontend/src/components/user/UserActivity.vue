<template>
  <div class="user-userActivity">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-print />
    <user-export />
    <dashboard-chart />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import OrderPrint from '@/components/order/OrderPrint.vue'
import UserExport from '@/components/user/UserExport.vue'
import DashboardChart from '@/components/dashboard/DashboardChart.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const analyticsStore = useAnalyticsStore()
  const auth = useAuth()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}/reviews`)
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
.user-userActivity {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
