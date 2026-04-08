<template>
  <div class="auth-authGuard">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <login-form @login-success="handleLoginSuccess" @forgot-password="handleForgotPassword" />
    <user-activity />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useFetch } from '@/composables/useFetch'
import axios from 'axios'
import LoginForm from '@/components/auth/LoginForm.vue'
import UserActivity from '@/components/user/UserActivity.vue'

const props = defineProps({
  items: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const productStore = useProductStore()


  const fetch = useFetch()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/categories')
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}

  function handleLoginSuccess() {
    console.log('login-success event received')
  }

  function handleForgotPassword() {
    console.log('forgot-password event received')
  }


onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.auth-authGuard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
