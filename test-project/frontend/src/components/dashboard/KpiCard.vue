<template>
  <div class="dashboard-kpiCard">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-comparison />
    <o-auth-consent />
    <user-notifications />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { useValidation } from '@/composables/useValidation'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { i18n } from '@/services/i18n'
import axios from 'axios'
import ProductComparison from '@/components/product/ProductComparison.vue'
import OAuthConsent from '@/components/auth/OAuthConsent.vue'
import UserNotifications from '@/components/user/UserNotifications.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['close', 'update'])

  const userStore = useUserStore()
  const cartStore = useCartStore()


  const validation = useValidation()
  const breakpoint = useBreakpoint()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/categories')
    const response1 = await axios.delete(`/api/users/${props.id}`)
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
.dashboard-kpiCard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
