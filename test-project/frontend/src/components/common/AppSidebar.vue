<template>
  <div class="common-appSidebar">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <sales-chart />
    <user-grid />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '@/stores/orderStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uIStore'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useAuth } from '@/composables/useAuth'
import { constants } from '@/utils/constants'
import axios from 'axios'
import SalesChart from '@/components/dashboard/SalesChart.vue'
import UserGrid from '@/components/user/UserGrid.vue'

const props = defineProps({
  items: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change', 'update'])

  const orderStore = useOrderStore()
  const authStore = useAuthStore()
  const uIStore = useUIStore()
  const { items, loading } = storeToRefs(uIStore)

  const breakpoint = useBreakpoint()
  const auth = useAuth()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/products/${props.id}`)
    const response1 = await axios.get('/api/products')
    data.value = response1.data
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
.common-appSidebar {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
