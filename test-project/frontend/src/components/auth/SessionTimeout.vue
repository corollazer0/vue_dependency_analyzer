<template>
  <div class="auth-sessionTimeout">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-stats />
    <token-refresh />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/composables/useAuth'
import { useDebounce } from '@/composables/useDebounce'
import { logger } from '@/services/logger'
import axios from 'axios'
import OrderStats from '@/components/order/OrderStats.vue'
import TokenRefresh from '@/components/auth/TokenRefresh.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'delete'])

  const uIStore = useUIStore()
  const authStore = useAuthStore()
  const auth = useAuth()
  const debounce = useDebounce()

  const loggerValue = inject('logger')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/inventory')
    const response = await axios.post('/api/products')
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
.auth-sessionTimeout {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
