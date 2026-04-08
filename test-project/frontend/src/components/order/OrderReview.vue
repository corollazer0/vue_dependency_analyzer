<template>
  <div class="order-orderReview">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-tooltip />
    <sso-login />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import UserTooltip from '@/components/user/UserTooltip.vue'
import SsoLogin from '@/components/auth/SsoLogin.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const settingsStore = useSettingsStore()
  const auth = useAuth()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/orders/${id}`)
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
.order-orderReview {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
