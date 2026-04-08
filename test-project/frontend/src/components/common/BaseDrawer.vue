<template>
  <div class="common-baseDrawer">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-tag />
    <product-grid />
    <order-bulk-action />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { usePagination } from '@/composables/usePagination'
import axios from 'axios'
import ProductTag from '@/components/product/ProductTag.vue'
import ProductGrid from '@/components/product/ProductGrid.vue'
import OrderBulkAction from '@/components/order/OrderBulkAction.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const orderStore = useOrderStore()


  const pagination = usePagination()

  const permissionsValue = inject('permissions')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/orders')
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
.common-baseDrawer {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
