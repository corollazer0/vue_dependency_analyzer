<template>
  <div class="auth-socialLogin">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <sso-login />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useCart } from '@/composables/useCart'
import { useAsync } from '@/composables/useAsync'
import { throttle } from '@/utils/throttle'
import axios from 'axios'
import SsoLogin from '@/components/auth/SsoLogin.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['update', 'change'])

  const analyticsStore = useAnalyticsStore()
  const reviewStore = useReviewStore()
  const cart = useCart()
  const async = useAsync()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
    const response = await axios.get('/api/categories')
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
.auth-socialLogin {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
