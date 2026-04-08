<template>
  <div class="auth-identityVerify">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-error />
    <base-avatar />
    <base-pagination />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useUserStore } from '@/stores/userStore'
import { useFetch } from '@/composables/useFetch'
import { useClipboard } from '@/composables/useClipboard'
import { logger } from '@/services/logger'
import axios from 'axios'
import AuthError from '@/components/auth/AuthError.vue'
import BaseAvatar from '@/components/common/BaseAvatar.vue'
import BasePagination from '@/components/common/BasePagination.vue'

const props = defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const uIStore = useUIStore()
  const userStore = useUserStore()


  const fetch = useFetch()
  const clipboard = useClipboard()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/register')
    const response1 = await axios.get('/api/analytics/conversions')
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
.auth-identityVerify {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
