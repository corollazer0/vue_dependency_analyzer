<template>
  <div class="dashboard-dateRangeSelector">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <dashboard-table />
    <user-sort />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useFetch } from '@/composables/useFetch'
import { useSearch } from '@/composables/useSearch'
import { throttle } from '@/utils/throttle'
import axios from 'axios'
import DashboardTable from '@/components/dashboard/DashboardTable.vue'
import UserSort from '@/components/user/UserSort.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'select'])

  const settingsStore = useSettingsStore()
  const authStore = useAuthStore()


  const fetch = useFetch()
  const search = useSearch()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/categories')
    const response1 = await axios.put(`/api/orders/${props.id}/status`)
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
.dashboard-dateRangeSelector {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
