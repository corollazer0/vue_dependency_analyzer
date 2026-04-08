<template>
  <div class="user-userBio">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-detail />
    <auth-callback />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useAuthStore } from '@/stores/authStore'
import { useSearch } from '@/composables/useSearch'
import { useToast } from '@/composables/useToast'
import { i18n } from '@/services/i18n'
import axios from 'axios'
import OrderDetail from '@/components/order/OrderDetail.vue'
import AuthCallback from '@/components/auth/AuthCallback.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const productStore = useProductStore()
  const authStore = useAuthStore()


  const search = useSearch()
  const toast = useToast()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/inventory/${props.id}`)
    const response1 = await axios.get('/api/notifications')
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
.user-userBio {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
