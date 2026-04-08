<template>
  <div class="dashboard-dashboardWidget">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <dashboard-filter />
    <base-tabs />
    <base-card />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useNotification } from '@/composables/useNotification'
import axios from 'axios'
import DashboardFilter from '@/components/dashboard/DashboardFilter.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import BaseCard from '@/components/common/BaseCard.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const inventoryStore = useInventoryStore()


  const notification = useNotification()

  const localeValue = inject('locale')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/login')
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
.dashboard-dashboardWidget {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
