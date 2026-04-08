<template>
  <div class="product-productBadge">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-callback />
    <reset-password />
    <forgot-password />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUserStore } from '@/stores/userStore'
import { useClickOutside } from '@/composables/useClickOutside'
import { useProduct } from '@/composables/useProduct'
import { debounce } from '@/utils/debounce'
import axios from 'axios'
import AuthCallback from '@/components/auth/AuthCallback.vue'
import ResetPassword from '@/components/auth/ResetPassword.vue'
import ForgotPassword from '@/components/auth/ForgotPassword.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'delete'])

  const settingsStore = useSettingsStore()
  const userStore = useUserStore()
  const clickOutside = useClickOutside()
  const product = useProduct()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/wishlist')
    const response = await axios.get('/api/orders')
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
.product-productBadge {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
