<template>
  <div class="common-appSidebar">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-navigation />
    <product-recommendation />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useCouponStore } from '@/stores/couponStore'
import { useEventBus } from '@/composables/useEventBus'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { formatCurrency } from '@/utils/formatCurrency'
import axios from 'axios'
import AppNavigation from '@/components/common/AppNavigation.vue'
import ProductRecommendation from '@/components/product/ProductRecommendation.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'select'])

  const analyticsStore = useAnalyticsStore()
  const couponStore = useCouponStore()
  const eventBus = useEventBus()
  const mediaQuery = useMediaQuery()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}/reviews`)
    const response = await axios.put(`/api/products/${id}`)
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
.common-appSidebar {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
