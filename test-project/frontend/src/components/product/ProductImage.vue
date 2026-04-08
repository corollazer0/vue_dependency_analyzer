<template>
  <div class="product-productImage">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-grid />
    <base-input />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useToast } from '@/composables/useToast'
import { useEventBus } from '@/composables/useEventBus'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import ProductGrid from '@/components/product/ProductGrid.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const couponStore = useCouponStore()
  const analyticsStore = useAnalyticsStore()
  const toast = useToast()
  const eventBus = useEventBus()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/products/${id}/reviews`)
    const response = await axios.get(`/api/products/${id}/reviews`)
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
.product-productImage {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
