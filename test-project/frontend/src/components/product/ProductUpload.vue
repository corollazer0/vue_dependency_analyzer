<template>
  <div class="product-productUpload">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-contacts />
    <trusted-devices />
    <register-form />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useAsync } from '@/composables/useAsync'
import { useValidation } from '@/composables/useValidation'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import UserContacts from '@/components/user/UserContacts.vue'
import TrustedDevices from '@/components/auth/TrustedDevices.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  size: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const wishlistStore = useWishlistStore()
  const inventoryStore = useInventoryStore()
  const async = useAsync()
  const validation = useValidation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/dashboard/stats')
    const response = await axios.post(`/api/orders/${id}/cancel`)
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
.product-productUpload {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
