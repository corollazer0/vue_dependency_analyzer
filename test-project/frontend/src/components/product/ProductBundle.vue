<template>
  <div class="product-productBundle">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <kpi-card />
    <product-comparison />
    <user-sort />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useFilter } from '@/composables/useFilter'
import { useCart } from '@/composables/useCart'
import { storage } from '@/services/storage'
import axios from 'axios'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import ProductComparison from '@/components/product/ProductComparison.vue'
import UserSort from '@/components/user/UserSort.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const couponStore = useCouponStore()
  const analyticsStore = useAnalyticsStore()


  const filter = useFilter()
  const cart = useCart()

  const themeValue = inject('theme')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/users/${props.id}`)
    const response1 = await axios.put(`/api/products/${props.id}`)
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
.product-productBundle {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
