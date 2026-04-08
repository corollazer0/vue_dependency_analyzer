<template>
  <div class="product-productGrid">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-accordion />
    <order-review />
    <order-return />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'
import BaseAccordion from '@/components/common/BaseAccordion.vue'
import OrderReview from '@/components/order/OrderReview.vue'
import OrderReturn from '@/components/order/OrderReturn.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const analyticsStore = useAnalyticsStore()
  const product = useProduct()
  provide('permissions', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
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
.product-productGrid {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
