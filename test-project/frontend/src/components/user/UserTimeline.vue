<template>
  <div class="user-userTimeline">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-notes />
    <base-dropdown />
    <conversion-chart />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useWebSocket } from '@/composables/useWebSocket'
import axios from 'axios'
import OrderNotes from '@/components/order/OrderNotes.vue'
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import ConversionChart from '@/components/dashboard/ConversionChart.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const settingsStore = useSettingsStore()


  const webSocket = useWebSocket()

  const localeValue = inject('locale')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post(`/api/products/${props.id}/reviews`)
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
.user-userTimeline {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
