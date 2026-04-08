<template>
  <div class="product-productAnalytics">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-notes />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useAuthStore } from '@/stores/authStore'
import { useClipboard } from '@/composables/useClipboard'
import { useCart } from '@/composables/useCart'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import OrderNotes from '@/components/order/OrderNotes.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const reviewStore = useReviewStore()
  const authStore = useAuthStore()
  const clipboard = useClipboard()
  const cart = useCart()
  provide('locale', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
    const response = await axios.post('/api/users')
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
.product-productAnalytics {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
