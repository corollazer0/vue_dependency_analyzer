<template>
  <div class="user-userSettings">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-item />
    <auth-error />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useKeyboard } from '@/composables/useKeyboard'
import axios from 'axios'
import OrderItem from '@/components/order/OrderItem.vue'
import AuthError from '@/components/auth/AuthError.vue'

const props = defineProps({
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const authStore = useAuthStore()
  const keyboard = useKeyboard()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/orders/${id}/status`)
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
.user-userSettings {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
