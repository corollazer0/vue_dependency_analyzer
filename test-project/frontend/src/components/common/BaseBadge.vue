<template>
  <div class="common-baseBadge">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-form />
    <user-profile />
    <password-strength />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useGeolocation } from '@/composables/useGeolocation'
import { useAuth } from '@/composables/useAuth'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import ProductForm from '@/components/product/ProductForm.vue'
import UserProfile from '@/components/user/UserProfile.vue'
import PasswordStrength from '@/components/auth/PasswordStrength.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['change', 'submit'])

  const userStore = useUserStore()
  const inventoryStore = useInventoryStore()
  const geolocation = useGeolocation()
  const auth = useAuth()
  provide('eventBus', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/settings')
    const response = await axios.delete(`/api/users/${id}`)
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
.common-baseBadge {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
