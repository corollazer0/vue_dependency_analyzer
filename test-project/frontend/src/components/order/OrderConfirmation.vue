<template>
  <div class="order-orderConfirmation">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ldap-login />
    <product-detail />
    <product-list />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useToast } from '@/composables/useToast'
import axios from 'axios'
import LdapLogin from '@/components/auth/LdapLogin.vue'
import ProductDetail from '@/components/product/ProductDetail.vue'
import ProductList from '@/components/product/ProductList.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const couponStore = useCouponStore()


  const toast = useToast()

  const loggerValue = inject('logger')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/wishlist')
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
.order-orderConfirmation {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
