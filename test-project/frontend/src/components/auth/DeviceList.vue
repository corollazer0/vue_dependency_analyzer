<template>
  <div class="auth-deviceList">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <captcha-widget />
    <app-footer />
    <api-key-manager />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useProductStore } from '@/stores/productStore'
import { useCart } from '@/composables/useCart'
import { usePermission } from '@/composables/usePermission'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import CaptchaWidget from '@/components/auth/CaptchaWidget.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import ApiKeyManager from '@/components/auth/ApiKeyManager.vue'

const props = defineProps({
  size: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const reviewStore = useReviewStore()
  const productStore = useProductStore()
  const cart = useCart()
  const permission = usePermission()
  provide('logger', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/cart/items')
    const response = await axios.put(`/api/products/${id}`)
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
.auth-deviceList {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
