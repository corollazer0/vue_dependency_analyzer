<template>
  <div class="auth-biometricAuth">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-review />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useThrottle } from '@/composables/useThrottle'
import axios from 'axios'
import OrderReview from '@/components/order/OrderReview.vue'

const props = defineProps({
  items: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const orderStore = useOrderStore()
  const throttle = useThrottle()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/products')
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
.auth-biometricAuth {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
