<template>
  <div class="order-orderInvoice">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <activity-feed />
    <captcha-widget />
    <metric-card />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCouponStore } from '@/stores/couponStore'
import { useKeyboard } from '@/composables/useKeyboard'
import { usePermission } from '@/composables/usePermission'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import CaptchaWidget from '@/components/auth/CaptchaWidget.vue'
import MetricCard from '@/components/dashboard/MetricCard.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'select'])

  const userStore = useUserStore()
  const couponStore = useCouponStore()


  const keyboard = useKeyboard()
  const permission = usePermission()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/users/${props.id}`)
    const response1 = await axios.get(`/api/products/${props.id}/reviews`)
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
.order-orderInvoice {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
