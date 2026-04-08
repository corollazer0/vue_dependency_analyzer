<template>
  <div class="product-productSku">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-contacts />
    <order-summary />
    <order-search />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useForm } from '@/composables/useForm'
import { useDebounce } from '@/composables/useDebounce'
import { analytics } from '@/services/analytics'
import axios from 'axios'
import UserContacts from '@/components/user/UserContacts.vue'
import OrderSummary from '@/components/order/OrderSummary.vue'
import OrderSearch from '@/components/order/OrderSearch.vue'

const props = defineProps({
  items: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'change'])

  const userStore = useUserStore()
  const notificationStore = useNotificationStore()


  const form = useForm()
  const debounce = useDebounce()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put(`/api/inventory/${props.id}`)
    const response1 = await axios.post('/api/users')
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
.product-productSku {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
