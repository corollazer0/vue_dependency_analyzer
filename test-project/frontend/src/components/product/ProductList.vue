<template>
  <div class="product-productList">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-refund />
    <order-chart />
    <product-import />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUIStore } from '@/stores/uIStore'
import { useClickOutside } from '@/composables/useClickOutside'
import { useSearch } from '@/composables/useSearch'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import OrderRefund from '@/components/order/OrderRefund.vue'
import OrderChart from '@/components/order/OrderChart.vue'
import ProductImport from '@/components/product/ProductImport.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const notificationStore = useNotificationStore()
  const uIStore = useUIStore()
  const clickOutside = useClickOutside()
  const search = useSearch()
  provide('locale', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/products/${id}`)
    const response = await axios.get('/api/users')
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
.product-productList {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
