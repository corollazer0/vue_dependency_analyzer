<template>
  <div class="dashboard-dashboardFilter">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <traffic-chart />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useUser } from '@/composables/useUser'
import axios from 'axios'
import TrafficChart from '@/components/dashboard/TrafficChart.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const uIStore = useUIStore()


  const user = useUser()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/products/${props.id}`)
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
.dashboard-dashboardFilter {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
