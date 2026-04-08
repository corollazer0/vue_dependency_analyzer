<template>
  <div class="auth-securityLog">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-card />
    <product-comparison />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useThrottle } from '@/composables/useThrottle'
import { useTheme } from '@/composables/useTheme'
import { formatCurrency } from '@/utils/formatCurrency'
import axios from 'axios'
import UserCard from '@/components/user/UserCard.vue'
import ProductComparison from '@/components/product/ProductComparison.vue'

const props = defineProps({
  size: { type: String, default: '' },
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const authStore = useAuthStore()
  const cartStore = useCartStore()
  const throttle = useThrottle()
  const theme = useTheme()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/users/${id}`)
    const response = await axios.get('/api/reviews')
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
.auth-securityLog {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
