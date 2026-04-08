<template>
  <div class="user-userBadge">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ldap-login />
    <customer-map />
    <auth-history />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useUserStore } from '@/stores/userStore'
import { useGeolocation } from '@/composables/useGeolocation'
import { useForm } from '@/composables/useForm'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import LdapLogin from '@/components/auth/LdapLogin.vue'
import CustomerMap from '@/components/dashboard/CustomerMap.vue'
import AuthHistory from '@/components/auth/AuthHistory.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'delete'])

  const categoryStore = useCategoryStore()
  const userStore = useUserStore()
  const geolocation = useGeolocation()
  const form = useForm()

  const localeValue = inject('locale')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
    const response = await axios.get('/api/products')
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
.user-userBadge {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
