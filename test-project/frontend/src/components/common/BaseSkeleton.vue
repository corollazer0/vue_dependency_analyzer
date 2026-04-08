<template>
  <div class="common-baseSkeleton">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-inventory />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useSearchStore } from '@/stores/searchStore'
import { useUser } from '@/composables/useUser'
import { useTheme } from '@/composables/useTheme'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ProductInventory from '@/components/product/ProductInventory.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const uIStore = useUIStore()
  const searchStore = useSearchStore()
  const user = useUser()
  const theme = useTheme()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${id}`)
    const response = await axios.post('/api/orders')
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
.common-baseSkeleton {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
