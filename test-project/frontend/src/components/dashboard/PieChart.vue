<template>
  <div class="dashboard-pieChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <activity-feed />
    <data-error />
    <sort-select />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import axios from 'axios'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import DataError from '@/components/common/DataError.vue'
import SortSelect from '@/components/common/SortSelect.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const productStore = useProductStore()
  const localStorage = useLocalStorage()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/cart')
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
.dashboard-pieChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
