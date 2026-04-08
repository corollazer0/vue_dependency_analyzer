<template>
  <div class="order-orderDelivery">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <radar-chart />
    <product-comparison />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useEventBus } from '@/composables/useEventBus'
import axios from 'axios'
import RadarChart from '@/components/dashboard/RadarChart.vue'
import ProductComparison from '@/components/product/ProductComparison.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const uIStore = useUIStore()


  const eventBus = useEventBus()

  const configValue = inject('config')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/products/${props.id}`)
    data.value = response.data
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
.order-orderDelivery {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
