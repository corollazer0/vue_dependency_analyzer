<template>
  <div class="user-userTags">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <customer-map />
    <area-chart />
    <sales-chart />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useGeolocation } from '@/composables/useGeolocation'
import { useTheme } from '@/composables/useTheme'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import CustomerMap from '@/components/dashboard/CustomerMap.vue'
import AreaChart from '@/components/dashboard/AreaChart.vue'
import SalesChart from '@/components/dashboard/SalesChart.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['select', 'submit'])

  const settingsStore = useSettingsStore()
  const inventoryStore = useInventoryStore()
  const geolocation = useGeolocation()
  const theme = useTheme()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/products/${id}`)
    const response = await axios.get(`/api/products/${id}`)
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
.user-userTags {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
