<template>
  <div class="order-orderExport">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <phone-verify />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useOrder } from '@/composables/useOrder'
import axios from 'axios'
import PhoneVerify from '@/components/auth/PhoneVerify.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const couponStore = useCouponStore()
  const order = useOrder()
  provide('logger', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/orders')
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
.order-orderExport {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
