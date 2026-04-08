<template>
  <div class="dashboard-barChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-profile />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useProductStore } from '@/stores/productStore'
import { useProduct } from '@/composables/useProduct'
import { useCart } from '@/composables/useCart'
import { client } from '@/api/client'
import axios from 'axios'
import UserProfile from '@/components/user/UserProfile.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['change', 'delete'])

  const inventoryStore = useInventoryStore()
  const productStore = useProductStore()
  const product = useProduct()
  const cart = useCart()
  provide('config', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/orders/${id}/cancel`)
    const response = await axios.delete(`/api/products/${id}`)
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
.dashboard-barChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
