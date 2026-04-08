<template>
  <div class="order-orderFilter">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-bundle />
    <metric-card />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useOrder } from '@/composables/useOrder'
import { useAuth } from '@/composables/useAuth'
import { storage } from '@/services/storage'
import axios from 'axios'
import ProductBundle from '@/components/product/ProductBundle.vue'
import MetricCard from '@/components/dashboard/MetricCard.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close', 'delete'])

  const productStore = useProductStore()
  const analyticsStore = useAnalyticsStore()


  const order = useOrder()
  const auth = useAuth()

  const themeValue = inject('theme')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/logout')
    const response1 = await axios.put(`/api/orders/${props.id}/status`)
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
.order-orderFilter {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
