<template>
  <div class="auth-authError">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-list />
    <data-grid />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useFetch } from '@/composables/useFetch'
import axios from 'axios'
import OrderList from '@/components/order/OrderList.vue'
import DataGrid from '@/components/dashboard/DataGrid.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const productStore = useProductStore()
  const fetch = useFetch()
  provide('config', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/inventory')
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
.auth-authError {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
