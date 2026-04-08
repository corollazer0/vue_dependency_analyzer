<template>
  <div class="dashboard-activityFeed">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <security-log />
    <product-image />
    <dashboard-table />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import axios from 'axios'
import SecurityLog from '@/components/auth/SecurityLog.vue'
import ProductImage from '@/components/product/ProductImage.vue'
import DashboardTable from '@/components/dashboard/DashboardTable.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const productStore = useProductStore()
  const localStorage = useLocalStorage()
  provide('eventBus', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
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
.dashboard-activityFeed {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
