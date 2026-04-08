<template>
  <div class="product-productBadge">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ldap-login />
    <order-feedback />
    <user-badge />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useToast } from '@/composables/useToast'
import { useCart } from '@/composables/useCart'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import LdapLogin from '@/components/auth/LdapLogin.vue'
import OrderFeedback from '@/components/order/OrderFeedback.vue'
import UserBadge from '@/components/user/UserBadge.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'update'])

  const searchStore = useSearchStore()
  const analyticsStore = useAnalyticsStore()


  const toast = useToast()
  const cart = useCart()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/products')
    const response1 = await axios.get(`/api/orders/${props.id}`)
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
.product-productBadge {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
