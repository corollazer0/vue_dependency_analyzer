<template>
  <div class="product-productTable">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-badge />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useOrderStore } from '@/stores/orderStore'
import { usePermission } from '@/composables/usePermission'
import { useSearch } from '@/composables/useSearch'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import ProductBadge from '@/components/product/ProductBadge.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const permission = usePermission()
  const search = useSearch()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/notifications')
    const response = await axios.post('/api/wishlist')
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
.product-productTable {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
