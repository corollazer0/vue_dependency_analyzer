<template>
  <div class="auth-ldapLogin">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <spark-line />
    <order-refund />
    <order-tracking />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useClickOutside } from '@/composables/useClickOutside'
import axios from 'axios'
import SparkLine from '@/components/dashboard/SparkLine.vue'
import OrderRefund from '@/components/order/OrderRefund.vue'
import OrderTracking from '@/components/order/OrderTracking.vue'

const props = defineProps({
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const reviewStore = useReviewStore()


  const clickOutside = useClickOutside()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/settings')
    data.value = response.data
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
.auth-ldapLogin {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
