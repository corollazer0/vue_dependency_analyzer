<template>
  <div class="product-productBundle">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-sort />
    <base-accordion />
    <base-toast />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useOrderStore } from '@/stores/orderStore'
import { useCart } from '@/composables/useCart'
import { useDebounce } from '@/composables/useDebounce'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import ProductSort from '@/components/product/ProductSort.vue'
import BaseAccordion from '@/components/common/BaseAccordion.vue'
import BaseToast from '@/components/common/BaseToast.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'change'])

  const inventoryStore = useInventoryStore()
  const orderStore = useOrderStore()
  const cart = useCart()
  const debounce = useDebounce()

  const localeValue = inject('locale')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
    const response = await axios.get(`/api/orders/${id}`)
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
.product-productBundle {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
