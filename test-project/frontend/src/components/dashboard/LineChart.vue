<template>
  <div class="dashboard-lineChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-badge />
    <user-table />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import BaseBadge from '@/components/common/BaseBadge.vue'
import UserTable from '@/components/user/UserTable.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const userStore = useUserStore()
  const auth = useAuth()

  const eventBusValue = inject('eventBus')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
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
.dashboard-lineChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
