<template>
  <div class="auth-twoFactorSetup">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-profile />
    <user-avatar />
    <traffic-chart />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useDebounce } from '@/composables/useDebounce'
import axios from 'axios'
import UserProfile from '@/components/user/UserProfile.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import TrafficChart from '@/components/dashboard/TrafficChart.vue'

const props = defineProps({
  size: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const inventoryStore = useInventoryStore()


  const debounce = useDebounce()



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
.auth-twoFactorSetup {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
