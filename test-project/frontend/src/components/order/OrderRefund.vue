<template>
  <div class="order-orderRefund">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <mini-chart />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useAuthStore } from '@/stores/authStore'
import { useValidation } from '@/composables/useValidation'
import { useGeolocation } from '@/composables/useGeolocation'
import { formatCurrency } from '@/utils/formatCurrency'
import axios from 'axios'
import MiniChart from '@/components/dashboard/MiniChart.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const uIStore = useUIStore()
  const authStore = useAuthStore()


  const validation = useValidation()
  const geolocation = useGeolocation()

  const loggerValue = inject('logger')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/orders/${props.id}/status`)
    const response1 = await axios.get('/api/cart')
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
.order-orderRefund {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
