<template>
  <div class="order-orderReceipt">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-input />
    <date-range-selector />
    <mini-chart />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import BaseInput from '@/components/common/BaseInput.vue'
import DateRangeSelector from '@/components/dashboard/DateRangeSelector.vue'
import MiniChart from '@/components/dashboard/MiniChart.vue'

const props = defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const settingsStore = useSettingsStore()
  const auth = useAuth()
  provide('locale', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/users/${id}`)
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
.order-orderReceipt {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
