<template>
  <div class="dashboard-areaChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-upload />
    <product-comparison />
    <app-sidebar />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useUserStore } from '@/stores/userStore'
import { useValidation } from '@/composables/useValidation'
import { useGeolocation } from '@/composables/useGeolocation'
import { debounce } from '@/utils/debounce'
import axios from 'axios'
import ProductUpload from '@/components/product/ProductUpload.vue'
import ProductComparison from '@/components/product/ProductComparison.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  items: { type: String, default: '' },
  loading: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update', 'delete'])

  const orderStore = useOrderStore()
  const userStore = useUserStore()
  const validation = useValidation()
  const geolocation = useGeolocation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/cart/items/${id}`)
    const response = await axios.get('/api/orders')
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
.dashboard-areaChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
