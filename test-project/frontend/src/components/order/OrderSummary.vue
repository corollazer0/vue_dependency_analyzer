<template>
  <div class="order-orderSummary">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-footer />
    <base-spinner />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useDarkMode } from '@/composables/useDarkMode'
import axios from 'axios'
import AppFooter from '@/components/common/AppFooter.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const notificationStore = useNotificationStore()
  const darkMode = useDarkMode()
  provide('locale', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/cart/items')
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
.order-orderSummary {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
