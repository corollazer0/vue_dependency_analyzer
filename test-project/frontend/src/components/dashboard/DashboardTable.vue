<template>
  <div class="dashboard-dashboardTable">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <token-refresh />
    <file-upload />
    <line-chart />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useCouponStore } from '@/stores/couponStore'
import { usePermission } from '@/composables/usePermission'
import { usePagination } from '@/composables/usePagination'
import { client } from '@/api/client'
import axios from 'axios'
import TokenRefresh from '@/components/auth/TokenRefresh.vue'
import FileUpload from '@/components/common/FileUpload.vue'
import LineChart from '@/components/dashboard/LineChart.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const analyticsStore = useAnalyticsStore()
  const couponStore = useCouponStore()


  const permission = usePermission()
  const pagination = usePagination()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/users')
    const response1 = await axios.get(`/api/orders/${props.id}`)
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
.dashboard-dashboardTable {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
