<template>
  <div class="product-productPrice">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <session-timeout />
    <kpi-card />
    <app-header />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCart } from '@/composables/useCart'
import axios from 'axios'
import SessionTimeout from '@/components/auth/SessionTimeout.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import AppHeader from '@/components/common/AppHeader.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const userStore = useUserStore()


  const cart = useCart()



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
.product-productPrice {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
