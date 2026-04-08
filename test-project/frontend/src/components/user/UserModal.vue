<template>
  <div class="user-userModal">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <register-form />
    <export-button />
    <forgot-password />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useProduct } from '@/composables/useProduct'
import { useFetch } from '@/composables/useFetch'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import ExportButton from '@/components/dashboard/ExportButton.vue'
import ForgotPassword from '@/components/auth/ForgotPassword.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['change', 'select'])

  const inventoryStore = useInventoryStore()
  const notificationStore = useNotificationStore()


  const product = useProduct()
  const fetch = useFetch()



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
.user-userModal {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
