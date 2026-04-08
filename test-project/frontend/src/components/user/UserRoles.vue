<template>
  <div class="user-userRoles">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-sku />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useOrderStore } from '@/stores/orderStore'
import { useClickOutside } from '@/composables/useClickOutside'
import { useDragDrop } from '@/composables/useDragDrop'
import { storage } from '@/services/storage'
import axios from 'axios'
import ProductSku from '@/components/product/ProductSku.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const productStore = useProductStore()
  const orderStore = useOrderStore()


  const clickOutside = useClickOutside()
  const dragDrop = useDragDrop()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/coupons/validate')
    const response1 = await axios.post('/api/auth/login')
    data.value = response1.data
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
.user-userRoles {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
