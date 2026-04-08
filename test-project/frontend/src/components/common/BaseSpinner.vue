<template>
  <div class="common-baseSpinner">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-bulk-edit />
    <product-bundle />
    <order-invoice />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import axios from 'axios'
import ProductBulkEdit from '@/components/product/ProductBulkEdit.vue'
import ProductBundle from '@/components/product/ProductBundle.vue'
import OrderInvoice from '@/components/order/OrderInvoice.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const analyticsStore = useAnalyticsStore()


  const localStorage = useLocalStorage()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post(`/api/orders/${props.id}/cancel`)
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
.common-baseSpinner {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
