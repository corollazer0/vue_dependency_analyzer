<template>
  <div class="user-userContacts">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-card />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useOrderStore } from '@/stores/orderStore'
import { usePermission } from '@/composables/usePermission'
import { useToast } from '@/composables/useToast'
import { validators } from '@/utils/validators'
import axios from 'axios'
import UserCard from '@/components/user/UserCard.vue'

const props = defineProps({
  size: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const authStore = useAuthStore()
  const orderStore = useOrderStore()


  const permission = usePermission()
  const toast = useToast()
  provide('locale', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/orders')
    const response1 = await axios.post('/api/auth/refresh')
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
.user-userContacts {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
