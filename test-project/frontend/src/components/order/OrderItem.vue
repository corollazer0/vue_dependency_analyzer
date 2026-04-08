<template>
  <div class="order-orderItem">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <role-guard />
    <metric-card />
    <base-alert />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useCouponStore } from '@/stores/couponStore'
import { useAuth } from '@/composables/useAuth'
import { useForm } from '@/composables/useForm'
import { auth } from '@/api/auth'
import axios from 'axios'
import RoleGuard from '@/components/auth/RoleGuard.vue'
import MetricCard from '@/components/dashboard/MetricCard.vue'
import BaseAlert from '@/components/common/BaseAlert.vue'

const props = defineProps({
  items: { type: String, default: '' },
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['change', 'update'])

  const reviewStore = useReviewStore()
  const couponStore = useCouponStore()
  const auth = useAuth()
  const form = useForm()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}/reviews`)
    const response = await axios.get('/api/settings')
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
.order-orderItem {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
