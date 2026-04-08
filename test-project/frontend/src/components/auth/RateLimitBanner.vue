<template>
  <div class="auth-rateLimitBanner">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <traffic-chart />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useOrderStore } from '@/stores/orderStore'
import { useNotification } from '@/composables/useNotification'
import { useOrder } from '@/composables/useOrder'
import { throttle } from '@/utils/throttle'
import axios from 'axios'
import TrafficChart from '@/components/dashboard/TrafficChart.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const notificationStore = useNotificationStore()
  const orderStore = useOrderStore()


  const notification = useNotification()
  const order = useOrder()

  const themeValue = inject('theme')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/users/${props.id}`)
    const response1 = await axios.get(`/api/products/${props.id}`)
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
.auth-rateLimitBanner {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
