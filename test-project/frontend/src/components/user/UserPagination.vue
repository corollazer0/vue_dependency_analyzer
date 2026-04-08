<template>
  <div class="user-userPagination">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-email />
    <radar-chart />
    <order-payment />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useKeyboard } from '@/composables/useKeyboard'
import axios from 'axios'
import OrderEmail from '@/components/order/OrderEmail.vue'
import RadarChart from '@/components/dashboard/RadarChart.vue'
import OrderPayment from '@/components/order/OrderPayment.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const userStore = useUserStore()
  const keyboard = useKeyboard()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/products/${id}`)
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
.user-userPagination {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
