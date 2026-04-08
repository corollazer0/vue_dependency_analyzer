<template>
  <div class="user-userDrawer">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-quick-view />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useWebSocket } from '@/composables/useWebSocket'
import axios from 'axios'
import ProductQuickView from '@/components/product/ProductQuickView.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const productStore = useProductStore()
  const webSocket = useWebSocket()

  const eventBusValue = inject('eventBus')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/dashboard/stats')
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
.user-userDrawer {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
