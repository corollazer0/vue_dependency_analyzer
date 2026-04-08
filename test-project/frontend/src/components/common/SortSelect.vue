<template>
  <div class="common-sortSelect">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <date-range-selector />
    <product-detail />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useUserStore } from '@/stores/userStore'
import { useFilter } from '@/composables/useFilter'
import { useNotification } from '@/composables/useNotification'
import { storage } from '@/services/storage'
import axios from 'axios'
import DateRangeSelector from '@/components/dashboard/DateRangeSelector.vue'
import ProductDetail from '@/components/product/ProductDetail.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const couponStore = useCouponStore()
  const userStore = useUserStore()


  const filter = useFilter()
  const notification = useNotification()
  provide('theme', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/wishlist')
    const response1 = await axios.get(`/api/products/${props.id}`)
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
.common-sortSelect {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
