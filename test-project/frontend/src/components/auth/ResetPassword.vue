<template>
  <div class="auth-resetPassword">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-carousel />
    <order-list />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCouponStore } from '@/stores/couponStore'
import { useOrder } from '@/composables/useOrder'
import { useFetch } from '@/composables/useFetch'
import { storage } from '@/services/storage'
import axios from 'axios'
import ProductCarousel from '@/components/product/ProductCarousel.vue'
import OrderList from '@/components/order/OrderList.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['select', 'close'])

  const settingsStore = useSettingsStore()
  const couponStore = useCouponStore()
  const order = useOrder()
  const fetch = useFetch()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/users/${id}`)
    const response = await axios.delete(`/api/wishlist/${id}`)
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
.auth-resetPassword {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
