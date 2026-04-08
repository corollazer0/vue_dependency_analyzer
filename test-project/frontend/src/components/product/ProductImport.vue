<template>
  <div class="product-productImport">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-filter />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useForm } from '@/composables/useForm'
import axios from 'axios'
import ProductFilter from '@/components/product/ProductFilter.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const inventoryStore = useInventoryStore()
  const form = useForm()

  const localeValue = inject('locale')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/cart')
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
.product-productImport {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
