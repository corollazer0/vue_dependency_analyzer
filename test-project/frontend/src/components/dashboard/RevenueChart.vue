<template>
  <div class="dashboard-revenueChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-navigation />
    <order-status />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useCart } from '@/composables/useCart'
import { usePermission } from '@/composables/usePermission'
import { i18n } from '@/services/i18n'
import axios from 'axios'
import AppNavigation from '@/components/common/AppNavigation.vue'
import OrderStatus from '@/components/order/OrderStatus.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const analyticsStore = useAnalyticsStore()
  const reviewStore = useReviewStore()


  const cart = useCart()
  const permission = usePermission()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/products/${props.id}/reviews`)
    const response1 = await axios.get('/api/users')
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
.dashboard-revenueChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
