<template>
  <div class="product-productInventory">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-callback />
    <token-refresh />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useUIStore } from '@/stores/uIStore'
import { useAuth } from '@/composables/useAuth'
import { useWebSocket } from '@/composables/useWebSocket'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import AuthCallback from '@/components/auth/AuthCallback.vue'
import TokenRefresh from '@/components/auth/TokenRefresh.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['change', 'update'])

  const productStore = useProductStore()
  const uIStore = useUIStore()
  const auth = useAuth()
  const webSocket = useWebSocket()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/dashboard/stats')
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
.product-productInventory {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
