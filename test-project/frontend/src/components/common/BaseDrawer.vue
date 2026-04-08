<template>
  <div class="common-baseDrawer">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <radar-chart />
    <auth-guard />
    <forgot-password />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'
import RadarChart from '@/components/dashboard/RadarChart.vue'
import AuthGuard from '@/components/auth/AuthGuard.vue'
import ForgotPassword from '@/components/auth/ForgotPassword.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const productStore = useProductStore()
  const permission = usePermission()

  const loggerValue = inject('logger')

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
.common-baseDrawer {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
