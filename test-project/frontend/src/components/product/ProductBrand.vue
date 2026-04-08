<template>
  <div class="product-productBrand">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <top-products />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useUIStore } from '@/stores/uIStore'
import { useAuth } from '@/composables/useAuth'
import { useSearch } from '@/composables/useSearch'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import TopProducts from '@/components/dashboard/TopProducts.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

  const inventoryStore = useInventoryStore()
  const uIStore = useUIStore()
  const auth = useAuth()
  const search = useSearch()

  const configValue = inject('config')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${id}`)
    const response = await axios.get('/api/reviews')
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
.product-productBrand {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
