<template>
  <div class="order-orderTimeline">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-stats />
    <ldap-login />
    <user-preferences />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useCouponStore } from '@/stores/couponStore'
import { useCart } from '@/composables/useCart'
import { useWebSocket } from '@/composables/useWebSocket'
import { i18n } from '@/services/i18n'
import axios from 'axios'
import UserStats from '@/components/user/UserStats.vue'
import LdapLogin from '@/components/auth/LdapLogin.vue'
import UserPreferences from '@/components/user/UserPreferences.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' },
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['change', 'close'])

  const authStore = useAuthStore()
  const couponStore = useCouponStore()


  const cart = useCart()
  const webSocket = useWebSocket()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/orders/${props.id}`)
    const response1 = await axios.post('/api/products')
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
.order-orderTimeline {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
