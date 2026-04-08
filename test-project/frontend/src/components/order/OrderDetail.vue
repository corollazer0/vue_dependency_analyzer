<template>
  <div class="order-orderDetail">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <bar-chart />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useEventBus } from '@/composables/useEventBus'
import { useClickOutside } from '@/composables/useClickOutside'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import BarChart from '@/components/dashboard/BarChart.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'close'])

  const productStore = useProductStore()
  const notificationStore = useNotificationStore()
  const eventBus = useEventBus()
  const clickOutside = useClickOutside()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/upload')
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
.order-orderDetail {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
