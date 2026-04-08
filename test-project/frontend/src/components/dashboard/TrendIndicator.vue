<template>
  <div class="dashboard-trendIndicator">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <identity-verify />
    <user-filter />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToast } from '@/composables/useToast'
import { useAsync } from '@/composables/useAsync'
import { auth } from '@/api/auth'
import axios from 'axios'
import IdentityVerify from '@/components/auth/IdentityVerify.vue'
import UserFilter from '@/components/user/UserFilter.vue'

const props = defineProps({
  size: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const notificationStore = useNotificationStore()
  const settingsStore = useSettingsStore()


  const toast = useToast()
  const async = useAsync()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/register')
    const response1 = await axios.delete(`/api/users/${props.id}`)
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
.dashboard-trendIndicator {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
