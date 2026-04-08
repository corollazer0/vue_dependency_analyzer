<template>
  <div class="auth-captchaWidget">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-badge />
    <order-history />
    <user-filter />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useAuth } from '@/composables/useAuth'
import { useWebSocket } from '@/composables/useWebSocket'
import { logger } from '@/services/logger'
import axios from 'axios'
import BaseBadge from '@/components/common/BaseBadge.vue'
import OrderHistory from '@/components/order/OrderHistory.vue'
import UserFilter from '@/components/user/UserFilter.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'change'])

  const authStore = useAuthStore()
  const userStore = useUserStore()
  const auth = useAuth()
  const webSocket = useWebSocket()

  const permissionsValue = inject('permissions')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/categories')
    const response = await axios.get('/api/search')
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
.auth-captchaWidget {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
