<template>
  <div class="dashboard-recentOrders">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <phone-verify />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUserStore } from '@/stores/userStore'
import { useUser } from '@/composables/useUser'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { constants } from '@/utils/constants'
import axios from 'axios'
import PhoneVerify from '@/components/auth/PhoneVerify.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const settingsStore = useSettingsStore()
  const userStore = useUserStore()


  const user = useUser()
  const mediaQuery = useMediaQuery()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/orders/${props.id}/status`)
    const response1 = await axios.get('/api/coupons')
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
.dashboard-recentOrders {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
