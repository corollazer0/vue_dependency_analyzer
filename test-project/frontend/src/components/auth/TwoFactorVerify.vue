<template>
  <div class="auth-twoFactorVerify">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-history />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useForm } from '@/composables/useForm'
import { useCart } from '@/composables/useCart'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import AuthHistory from '@/components/auth/AuthHistory.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const uIStore = useUIStore()
  const categoryStore = useCategoryStore()


  const form = useForm()
  const cart = useCart()
  provide('permissions', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/cart/items')
    const response1 = await axios.get('/api/settings')
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
.auth-twoFactorVerify {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
