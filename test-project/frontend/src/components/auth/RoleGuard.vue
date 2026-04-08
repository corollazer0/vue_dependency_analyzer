<template>
  <div class="auth-roleGuard">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-gallery />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'
import ProductGallery from '@/components/product/ProductGallery.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const orderStore = useOrderStore()
  const cart = useCart()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/orders/${id}/status`)
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
.auth-roleGuard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
