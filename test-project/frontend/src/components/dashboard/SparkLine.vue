<template>
  <div class="dashboard-sparkLine">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-table />
    <order-summary />
    <order-dispute />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useKeyboard } from '@/composables/useKeyboard'
import axios from 'axios'
import ProductTable from '@/components/product/ProductTable.vue'
import OrderSummary from '@/components/order/OrderSummary.vue'
import OrderDispute from '@/components/order/OrderDispute.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const cartStore = useCartStore()


  const keyboard = useKeyboard()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/coupons/validate')
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
.dashboard-sparkLine {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
