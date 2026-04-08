<template>
  <div class="order-orderStats">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <trend-indicator />
    <base-tooltip />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'
import TrendIndicator from '@/components/dashboard/TrendIndicator.vue'
import BaseTooltip from '@/components/common/BaseTooltip.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const searchStore = useSearchStore()


  const product = useProduct()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/wishlist')
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}




onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.order-orderStats {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
