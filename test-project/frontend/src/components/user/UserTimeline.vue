<template>
  <div class="user-userTimeline">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-header />
    <base-chip />
    <sales-chart />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useKeyboard } from '@/composables/useKeyboard'
import axios from 'axios'
import AppHeader from '@/components/common/AppHeader.vue'
import BaseChip from '@/components/common/BaseChip.vue'
import SalesChart from '@/components/dashboard/SalesChart.vue'

const props = defineProps({
  items: { type: String, default: '' },
  size: { type: String, default: '' },
  title: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const userStore = useUserStore()
  const keyboard = useKeyboard()

  const eventBusValue = inject('eventBus')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/dashboard/revenue')
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
.user-userTimeline {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
