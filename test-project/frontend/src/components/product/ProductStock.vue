<template>
  <div class="product-productStock">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <customer-map />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useToast } from '@/composables/useToast'
import axios from 'axios'
import CustomerMap from '@/components/dashboard/CustomerMap.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const cartStore = useCartStore()
  const toast = useToast()



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
.product-productStock {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
