<template>
  <div class="dashboard-trafficChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <metric-card />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useFilter } from '@/composables/useFilter'
import { useClickOutside } from '@/composables/useClickOutside'
import { auth } from '@/api/auth'
import axios from 'axios'
import MetricCard from '@/components/dashboard/MetricCard.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update', 'select'])

  const orderStore = useOrderStore()
  const reviewStore = useReviewStore()


  const filter = useFilter()
  const clickOutside = useClickOutside()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.delete(`/api/users/${props.id}`)
    const response1 = await axios.put(`/api/users/${props.id}`)
    data.value = response1.data
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
.dashboard-trafficChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
