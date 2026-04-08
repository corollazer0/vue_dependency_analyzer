<template>
  <div class="product-productCarousel">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-list />
    <app-navigation />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUIStore } from '@/stores/uIStore'
import { useForm } from '@/composables/useForm'
import { useThrottle } from '@/composables/useThrottle'
import { auth } from '@/api/auth'
import axios from 'axios'
import UserList from '@/components/user/UserList.vue'
import AppNavigation from '@/components/common/AppNavigation.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['change', 'submit'])

  const notificationStore = useNotificationStore()
  const uIStore = useUIStore()
  const form = useForm()
  const throttle = useThrottle()

  const themeValue = inject('theme')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/orders/${id}/status`)
    const response = await axios.get('/api/analytics/traffic')
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
.product-productCarousel {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
