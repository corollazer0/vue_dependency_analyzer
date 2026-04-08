<template>
  <div class="order-orderCancel">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-comparison />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useCouponStore } from '@/stores/couponStore'
import { useSearch } from '@/composables/useSearch'
import { usePermission } from '@/composables/usePermission'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ProductComparison from '@/components/product/ProductComparison.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const cartStore = useCartStore()
  const couponStore = useCouponStore()
  const search = useSearch()
  const permission = usePermission()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/upload')
    const response = await axios.get('/api/search')
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
.order-orderCancel {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
