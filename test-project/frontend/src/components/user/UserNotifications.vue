<template>
  <div class="user-userNotifications">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <biometric-auth />
    <order-filter />
    <order-detail />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { usePagination } from '@/composables/usePagination'
import { validators } from '@/utils/validators'
import axios from 'axios'
import BiometricAuth from '@/components/auth/BiometricAuth.vue'
import OrderFilter from '@/components/order/OrderFilter.vue'
import OrderDetail from '@/components/order/OrderDetail.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['close', 'change'])

  const analyticsStore = useAnalyticsStore()
  const reviewStore = useReviewStore()
  const localStorage = useLocalStorage()
  const pagination = usePagination()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/analytics/conversions')
    const response = await axios.put('/api/settings')
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
.user-userNotifications {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
