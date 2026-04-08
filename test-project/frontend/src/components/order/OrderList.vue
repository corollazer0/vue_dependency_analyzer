<template>
  <div class="order-orderList">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <bar-chart />
    <base-alert />
    <app-header />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'
import BarChart from '@/components/dashboard/BarChart.vue'
import BaseAlert from '@/components/common/BaseAlert.vue'
import AppHeader from '@/components/common/AppHeader.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const orderStore = useOrderStore()
  const product = useProduct()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/products/${id}/reviews`)
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
.order-orderList {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
