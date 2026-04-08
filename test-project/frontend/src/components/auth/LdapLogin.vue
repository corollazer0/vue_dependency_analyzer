<template>
  <div class="auth-ldapLogin">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-popover />
    <social-login />
    <user-profile />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useDragDrop } from '@/composables/useDragDrop'
import axios from 'axios'
import UserPopover from '@/components/user/UserPopover.vue'
import SocialLogin from '@/components/auth/SocialLogin.vue'
import UserProfile from '@/components/user/UserProfile.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const analyticsStore = useAnalyticsStore()
  const dragDrop = useDragDrop()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/analytics/traffic')
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
.auth-ldapLogin {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
