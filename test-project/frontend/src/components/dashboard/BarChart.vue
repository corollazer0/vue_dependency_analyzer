<template>
  <div class="dashboard-barChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-card />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useCartStore } from '@/stores/cartStore'
import { useFetch } from '@/composables/useFetch'
import { useValidation } from '@/composables/useValidation'
import { products } from '@/api/products'
import axios from 'axios'
import UserCard from '@/components/user/UserCard.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const reviewStore = useReviewStore()
  const cartStore = useCartStore()


  const fetch = useFetch()
  const validation = useValidation()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/products/${props.id}/reviews`)
    const response1 = await axios.post(`/api/orders/${props.id}/cancel`)
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
.dashboard-barChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
