<template>
  <div class="order-orderSearch">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <revenue-chart />
    <app-header />
    <base-toast />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useEventBus } from '@/composables/useEventBus'
import axios from 'axios'
import RevenueChart from '@/components/dashboard/RevenueChart.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import BaseToast from '@/components/common/BaseToast.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const notificationStore = useNotificationStore()
  const eventBus = useEventBus()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
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
.order-orderSearch {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
