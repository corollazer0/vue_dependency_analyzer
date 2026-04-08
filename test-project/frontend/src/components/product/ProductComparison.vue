<template>
  <div class="product-productComparison">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-receipt />
    <biometric-auth />
    <product-stock />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useValidation } from '@/composables/useValidation'
import axios from 'axios'
import OrderReceipt from '@/components/order/OrderReceipt.vue'
import BiometricAuth from '@/components/auth/BiometricAuth.vue'
import ProductStock from '@/components/product/ProductStock.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const orderStore = useOrderStore()


  const validation = useValidation()

  const localeValue = inject('locale')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post(`/api/products/${props.id}/reviews`)
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
.product-productComparison {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
