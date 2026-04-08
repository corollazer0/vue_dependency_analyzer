<template>
  <div class="user-userSort">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-input />
    <product-grid />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useFilter } from '@/composables/useFilter'
import { useSearch } from '@/composables/useSearch'
import { throttle } from '@/utils/throttle'
import axios from 'axios'
import BaseInput from '@/components/common/BaseInput.vue'
import ProductGrid from '@/components/product/ProductGrid.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change', 'update'])

  const productStore = useProductStore()
  const inventoryStore = useInventoryStore()
  const filter = useFilter()
  const search = useSearch()

  const themeValue = inject('theme')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/upload')
    const response = await axios.put(`/api/users/${id}`)
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
.user-userSort {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
