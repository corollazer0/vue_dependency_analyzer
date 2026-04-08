<template>
  <div class="common-baseChip">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <device-list />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useToast } from '@/composables/useToast'
import axios from 'axios'
import DeviceList from '@/components/auth/DeviceList.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const analyticsStore = useAnalyticsStore()
  const toast = useToast()

  const eventBusValue = inject('eventBus')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/products/${id}/reviews`)
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
.common-baseChip {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
