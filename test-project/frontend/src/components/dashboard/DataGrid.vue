<template>
  <div class="dashboard-dataGrid">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-variant />
    <dashboard-chart />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useKeyboard } from '@/composables/useKeyboard'
import axios from 'axios'
import ProductVariant from '@/components/product/ProductVariant.vue'
import DashboardChart from '@/components/dashboard/DashboardChart.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const inventoryStore = useInventoryStore()


  const keyboard = useKeyboard()
  provide('locale', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/users/${props.id}`)
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
.dashboard-dataGrid {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
