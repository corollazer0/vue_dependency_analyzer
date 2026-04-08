<template>
  <div class="user-userTooltip">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-gallery />
    <product-analytics />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useValidation } from '@/composables/useValidation'
import { useCart } from '@/composables/useCart'
import { debounce } from '@/utils/debounce'
import axios from 'axios'
import ProductGallery from '@/components/product/ProductGallery.vue'
import ProductAnalytics from '@/components/product/ProductAnalytics.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  title: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const couponStore = useCouponStore()
  const reviewStore = useReviewStore()


  const validation = useValidation()
  const cart = useCart()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/products')
    const response1 = await axios.get('/api/cart')
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
.user-userTooltip {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
