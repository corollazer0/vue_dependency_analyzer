<template>
  <div class="auth-loginForm">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-footer />
    <base-alert />
    </div>
    <button @click="emit('login-success')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCouponStore } from '@/stores/couponStore'
import { useTheme } from '@/composables/useTheme'
import axios from 'axios'
import AppFooter from '@/components/common/AppFooter.vue'
import BaseAlert from '@/components/common/BaseAlert.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['login-success', 'forgot-password'])

  const couponStore = useCouponStore()

  const router = useRouter()
  const theme = useTheme()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.delete(`/api/users/${props.id}`)
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}


  function goToRegister() { router.push('/register') }

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.auth-loginForm {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
