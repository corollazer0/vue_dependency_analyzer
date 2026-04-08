<template>
  <div class="order-orderLabel">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-chip />
    <product-badge />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useCartStore } from '@/stores/cartStore'
import { useAsync } from '@/composables/useAsync'
import { useForm } from '@/composables/useForm'
import { throttle } from '@/utils/throttle'
import axios from 'axios'
import BaseChip from '@/components/common/BaseChip.vue'
import ProductBadge from '@/components/product/ProductBadge.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const productStore = useProductStore()
  const cartStore = useCartStore()
  const async = useAsync()
  const form = useForm()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/dashboard/revenue')
    const response = await axios.put(`/api/orders/${id}/status`)
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
.order-orderLabel {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
