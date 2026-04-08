<template>
  <div class="dashboard-dashboardWidget">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <conversion-chart />
    <product-search />
    <user-profile />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import ConversionChart from '@/components/dashboard/ConversionChart.vue'
import ProductSearch from '@/components/product/ProductSearch.vue'
import UserProfile from '@/components/user/UserProfile.vue'

const props = defineProps({
  size: { type: String, default: '' },
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const cartStore = useCartStore()
  const auth = useAuth()

  const eventBusValue = inject('eventBus')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/notifications/${id}/read`)
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
.dashboard-dashboardWidget {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
