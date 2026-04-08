<template>
  <div class="common-fileUpload">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-chart />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useProductStore } from '@/stores/productStore'
import { useAuth } from '@/composables/useAuth'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import OrderChart from '@/components/order/OrderChart.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const orderStore = useOrderStore()
  const productStore = useProductStore()
  const auth = useAuth()
  const localStorage = useLocalStorage()

  const themeValue = inject('theme')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${id}`)
    const response = await axios.delete(`/api/users/${id}`)
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
.common-fileUpload {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
