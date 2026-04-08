<template>
  <div class="dashboard-radarChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-settings />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useDragDrop } from '@/composables/useDragDrop'
import axios from 'axios'
import UserSettings from '@/components/user/UserSettings.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const categoryStore = useCategoryStore()
  const dragDrop = useDragDrop()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
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
.dashboard-radarChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
