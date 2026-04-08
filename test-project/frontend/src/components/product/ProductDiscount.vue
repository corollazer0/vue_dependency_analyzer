<template>
  <div class="product-productDiscount">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <loading-overlay />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useFilter } from '@/composables/useFilter'
import axios from 'axios'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const analyticsStore = useAnalyticsStore()


  const filter = useFilter()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/users')
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
.product-productDiscount {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
