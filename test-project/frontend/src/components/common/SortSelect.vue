<template>
  <div class="common-sortSelect">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-select />
    <email-verify />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useClickOutside } from '@/composables/useClickOutside'
import { useValidation } from '@/composables/useValidation'
import { products } from '@/api/products'
import axios from 'axios'
import BaseSelect from '@/components/common/BaseSelect.vue'
import EmailVerify from '@/components/auth/EmailVerify.vue'

const props = defineProps({
  items: { type: String, default: '' },
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit'])

  const couponStore = useCouponStore()
  const notificationStore = useNotificationStore()
  const clickOutside = useClickOutside()
  const validation = useValidation()
  provide('config', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/coupons/validate')
    const response = await axios.post('/api/orders')
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
.common-sortSelect {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
