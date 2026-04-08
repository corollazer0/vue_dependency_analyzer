<template>
  <div class="order-orderBulkAction">
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
import { ref, computed, onMounted, inject } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useAsync } from '@/composables/useAsync'
import axios from 'axios'
import ProductComparison from '@/components/product/ProductComparison.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const productStore = useProductStore()
  const async = useAsync()

  const permissionsValue = inject('permissions')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${id}`)
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
.order-orderBulkAction {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
