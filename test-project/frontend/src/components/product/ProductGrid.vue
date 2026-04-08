<template>
  <div class="product-productGrid">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-upload />
    <base-table />
    <pie-chart />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useDarkMode } from '@/composables/useDarkMode'
import axios from 'axios'
import ProductUpload from '@/components/product/ProductUpload.vue'
import BaseTable from '@/components/common/BaseTable.vue'
import PieChart from '@/components/dashboard/PieChart.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const orderStore = useOrderStore()


  const darkMode = useDarkMode()
  provide('theme', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/categories')
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
.product-productGrid {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
