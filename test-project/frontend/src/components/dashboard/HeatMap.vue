<template>
  <div class="dashboard-heatMap">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-notes />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useFilter } from '@/composables/useFilter'
import axios from 'axios'
import OrderNotes from '@/components/order/OrderNotes.vue'

const props = defineProps({
  size: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const userStore = useUserStore()


  const filter = useFilter()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/users')
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
.dashboard-heatMap {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
