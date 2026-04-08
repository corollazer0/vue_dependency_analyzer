<template>
  <div class="dashboard-kpiCard">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-dispute />
    <rate-limit-banner />
    <social-login />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useThrottle } from '@/composables/useThrottle'
import { useDarkMode } from '@/composables/useDarkMode'
import { constants } from '@/utils/constants'
import axios from 'axios'
import OrderDispute from '@/components/order/OrderDispute.vue'
import RateLimitBanner from '@/components/auth/RateLimitBanner.vue'
import SocialLogin from '@/components/auth/SocialLogin.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  size: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['change', 'close'])

  const searchStore = useSearchStore()
  const notificationStore = useNotificationStore()
  const throttle = useThrottle()
  const darkMode = useDarkMode()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
    const response = await axios.post(`/api/products/${id}/reviews`)
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
.dashboard-kpiCard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
