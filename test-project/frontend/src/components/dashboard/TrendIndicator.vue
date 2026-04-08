<template>
  <div class="dashboard-trendIndicator">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <device-list />
    <user-drawer />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useCouponStore } from '@/stores/couponStore'
import { useAsync } from '@/composables/useAsync'
import { useValidation } from '@/composables/useValidation'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import DeviceList from '@/components/auth/DeviceList.vue'
import UserDrawer from '@/components/user/UserDrawer.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['change', 'select'])

  const uIStore = useUIStore()
  const couponStore = useCouponStore()
  const async = useAsync()
  const validation = useValidation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/settings')
    const response = await axios.get('/api/search')
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
.dashboard-trendIndicator {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
