<template>
  <div class="order-orderFeedback">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ip-whitelist />
    <app-navigation />
    <social-login />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useKeyboard } from '@/composables/useKeyboard'
import { useToast } from '@/composables/useToast'
import { debounce } from '@/utils/debounce'
import axios from 'axios'
import IpWhitelist from '@/components/auth/IpWhitelist.vue'
import AppNavigation from '@/components/common/AppNavigation.vue'
import SocialLogin from '@/components/auth/SocialLogin.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'select'])

  const orderStore = useOrderStore()
  const inventoryStore = useInventoryStore()


  const keyboard = useKeyboard()
  const toast = useToast()

  const localeValue = inject('locale')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/search')
    const response1 = await axios.get('/api/coupons')
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
.order-orderFeedback {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
