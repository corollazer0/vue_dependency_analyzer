<template>
  <div class="common-dataEmpty">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-recommendation />
    <product-image />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useOrderStore } from '@/stores/orderStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { useProduct } from '@/composables/useProduct'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import ProductRecommendation from '@/components/product/ProductRecommendation.vue'
import ProductImage from '@/components/product/ProductImage.vue'

const props = defineProps({
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const uIStore = useUIStore()
  const orderStore = useOrderStore()
  const localStorage = useLocalStorage()
  const product = useProduct()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${id}`)
    const response = await axios.get(`/api/users/${id}`)
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
.common-dataEmpty {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
