<template>
  <div class="dashboard-recentOrders">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-card />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useUIStore } from '@/stores/uIStore'
import { useDarkMode } from '@/composables/useDarkMode'
import { usePermission } from '@/composables/usePermission'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import UserCard from '@/components/user/UserCard.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'change'])

  const inventoryStore = useInventoryStore()
  const uIStore = useUIStore()
  const darkMode = useDarkMode()
  const permission = usePermission()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/products/${id}`)
    const response = await axios.post('/api/upload')
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
.dashboard-recentOrders {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
