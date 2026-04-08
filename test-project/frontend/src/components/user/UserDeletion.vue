<template>
  <div class="user-userDeletion">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-guard />
    <order-confirmation />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useBreakpoint } from '@/composables/useBreakpoint'
import axios from 'axios'
import AuthGuard from '@/components/auth/AuthGuard.vue'
import OrderConfirmation from '@/components/order/OrderConfirmation.vue'

const props = defineProps({
  size: { type: String, default: '' },
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const analyticsStore = useAnalyticsStore()
  const breakpoint = useBreakpoint()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put('/api/settings')
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
.user-userDeletion {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
