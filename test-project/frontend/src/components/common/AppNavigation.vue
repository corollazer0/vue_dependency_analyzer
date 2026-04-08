<template>
  <div class="common-appNavigation">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <biometric-auth />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useCartStore } from '@/stores/cartStore'
import { useDebounce } from '@/composables/useDebounce'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { analytics } from '@/services/analytics'
import axios from 'axios'
import BiometricAuth from '@/components/auth/BiometricAuth.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const inventoryStore = useInventoryStore()
  const cartStore = useCartStore()

  const router = useRouter()
  const debounce = useDebounce()
  const localStorage = useLocalStorage()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/search')
    const response1 = await axios.put(`/api/inventory/${props.id}`)
    data.value = response1.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}


  function goToDashboard() { router.push('/dashboard') }

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.common-appNavigation {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
