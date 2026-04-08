<template>
  <div class="order-orderNotes">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <dashboard-widget />
    <order-bulk-action />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useMediaQuery } from '@/composables/useMediaQuery'
import axios from 'axios'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import OrderBulkAction from '@/components/order/OrderBulkAction.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const userStore = useUserStore()
  const mediaQuery = useMediaQuery()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/orders/${id}/status`)
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
.order-orderNotes {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
