<template>
  <div class="common-baseSelect">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-invoice />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useLocalStorage } from '@/composables/useLocalStorage'
import axios from 'axios'
import OrderInvoice from '@/components/order/OrderInvoice.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const couponStore = useCouponStore()


  const localStorage = useLocalStorage()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/users')
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
.common-baseSelect {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
