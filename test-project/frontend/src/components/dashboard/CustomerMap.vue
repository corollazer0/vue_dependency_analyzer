<template>
  <div class="dashboard-customerMap">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-form />
    <search-bar />
    <otp-input />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useFetch } from '@/composables/useFetch'
import { useCart } from '@/composables/useCart'
import { storage } from '@/services/storage'
import axios from 'axios'
import UserForm from '@/components/user/UserForm.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import OtpInput from '@/components/auth/OtpInput.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'select'])

  const notificationStore = useNotificationStore()
  const reviewStore = useReviewStore()


  const fetch = useFetch()
  const cart = useCart()

  const localeValue = inject('locale')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/analytics/conversions')
    const response1 = await axios.put(`/api/users/${props.id}`)
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
.dashboard-customerMap {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
