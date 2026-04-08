<template>
  <div class="dashboard-dashboardLayout">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <dashboard-filter />
    <metric-card />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/searchStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useNotification } from '@/composables/useNotification'
import { useSearch } from '@/composables/useSearch'
import { debounce } from '@/utils/debounce'
import axios from 'axios'
import DashboardFilter from '@/components/dashboard/DashboardFilter.vue'
import MetricCard from '@/components/dashboard/MetricCard.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const searchStore = useSearchStore()
  const analyticsStore = useAnalyticsStore()

  const router = useRouter()
  const notification = useNotification()
  const search = useSearch()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/orders')
    const response1 = await axios.get(`/api/products/${props.id}`)
    data.value = response1.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}


  function goToSettings() { router.push('/settings') }

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard-dashboardLayout {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
