<template>
  <div class="dashboard-topProducts">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-cancel />
    <date-range-selector />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import axios from 'axios'
import OrderCancel from '@/components/order/OrderCancel.vue'
import DateRangeSelector from '@/components/dashboard/DateRangeSelector.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const notificationStore = useNotificationStore()
  const localStorage = useLocalStorage()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
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
.dashboard-topProducts {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
