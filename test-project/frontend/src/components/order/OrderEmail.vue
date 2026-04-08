<template>
  <div class="order-orderEmail">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <social-login />
    <order-review />
    <user-filter />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useGeolocation } from '@/composables/useGeolocation'
import axios from 'axios'
import SocialLogin from '@/components/auth/SocialLogin.vue'
import OrderReview from '@/components/order/OrderReview.vue'
import UserFilter from '@/components/user/UserFilter.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const reviewStore = useReviewStore()
  const geolocation = useGeolocation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/orders/${id}`)
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
.order-orderEmail {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
