<template>
  <div class="order-orderExport">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <kpi-card />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { usePagination } from '@/composables/usePagination'
import axios from 'axios'
import KpiCard from '@/components/dashboard/KpiCard.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const searchStore = useSearchStore()


  const pagination = usePagination()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/products/${props.id}`)
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
.order-orderExport {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
