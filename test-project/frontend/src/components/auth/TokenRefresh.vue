<template>
  <div class="auth-tokenRefresh">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-price />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { useKeyboard } from '@/composables/useKeyboard'
import { useDragDrop } from '@/composables/useDragDrop'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ProductPrice from '@/components/product/ProductPrice.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const userStore = useUserStore()
  const authStore = useAuthStore()


  const keyboard = useKeyboard()
  const dragDrop = useDragDrop()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/analytics/conversions')
    const response1 = await axios.get(`/api/users/${props.id}`)
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
.auth-tokenRefresh {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
