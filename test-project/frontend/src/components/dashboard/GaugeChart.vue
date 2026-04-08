<template>
  <div class="dashboard-gaugeChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-select />
    <app-header />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useProductStore } from '@/stores/productStore'
import { useSearch } from '@/composables/useSearch'
import { useToast } from '@/composables/useToast'
import { orders } from '@/api/orders'
import axios from 'axios'
import BaseSelect from '@/components/common/BaseSelect.vue'
import AppHeader from '@/components/common/AppHeader.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['change', 'select'])

  const analyticsStore = useAnalyticsStore()
  const productStore = useProductStore()


  const search = useSearch()
  const toast = useToast()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/dashboard/revenue')
    const response1 = await axios.get(`/api/products/${props.id}`)
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
.dashboard-gaugeChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
