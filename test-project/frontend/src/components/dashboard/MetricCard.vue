<template>
  <div class="dashboard-metricCard">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-dispute />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useClickOutside } from '@/composables/useClickOutside'
import axios from 'axios'
import OrderDispute from '@/components/order/OrderDispute.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const searchStore = useSearchStore()
  const clickOutside = useClickOutside()

  const permissionsValue = inject('permissions')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/analytics/traffic')
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
.dashboard-metricCard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
