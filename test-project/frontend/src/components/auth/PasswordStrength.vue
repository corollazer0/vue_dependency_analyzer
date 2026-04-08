<template>
  <div class="auth-passwordStrength">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <biometric-auth />
    <user-roles />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useOrder } from '@/composables/useOrder'
import axios from 'axios'
import BiometricAuth from '@/components/auth/BiometricAuth.vue'
import UserRoles from '@/components/user/UserRoles.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const settingsStore = useSettingsStore()
  const order = useOrder()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/orders')
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
.auth-passwordStrength {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
