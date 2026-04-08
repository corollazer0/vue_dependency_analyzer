<template>
  <div class="dashboard-salesChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <forgot-password />
    <base-table />
    <filter-panel />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'
import ForgotPassword from '@/components/auth/ForgotPassword.vue'
import BaseTable from '@/components/common/BaseTable.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'

const props = defineProps({
  size: { type: String, default: '' },
  loading: { type: String, default: '' },
  items: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const orderStore = useOrderStore()
  const permission = usePermission()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/coupons/validate')
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
.dashboard-salesChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
