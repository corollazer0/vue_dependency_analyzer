<template>
  <div class="order-orderPayment">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-import />
    <logout-confirm />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useCart } from '@/composables/useCart'
import { useSearch } from '@/composables/useSearch'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ProductImport from '@/components/product/ProductImport.vue'
import LogoutConfirm from '@/components/auth/LogoutConfirm.vue'

const props = defineProps({
  items: { type: String, default: '' },
  size: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const uIStore = useUIStore()
  const notificationStore = useNotificationStore()
  const cart = useCart()
  const search = useSearch()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}`)
    const response = await axios.post(`/api/products/${id}/reviews`)
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
.order-orderPayment {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
