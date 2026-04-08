<template>
  <div class="product-productGallery">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-input />
    <user-grid />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { usePermission } from '@/composables/usePermission'
import { useGeolocation } from '@/composables/useGeolocation'
import { constants } from '@/utils/constants'
import axios from 'axios'
import BaseInput from '@/components/common/BaseInput.vue'
import UserGrid from '@/components/user/UserGrid.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['select', 'change'])

  const orderStore = useOrderStore()
  const wishlistStore = useWishlistStore()


  const permission = usePermission()
  const geolocation = useGeolocation()
  provide('permissions', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/orders')
    const response1 = await axios.get('/api/products')
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
.product-productGallery {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
