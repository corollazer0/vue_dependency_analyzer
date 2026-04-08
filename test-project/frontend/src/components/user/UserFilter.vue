<template>
  <div class="user-userFilter">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <security-log />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useEventBus } from '@/composables/useEventBus'
import axios from 'axios'
import SecurityLog from '@/components/auth/SecurityLog.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const analyticsStore = useAnalyticsStore()
  const eventBus = useEventBus()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/products/${id}`)
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
.user-userFilter {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
