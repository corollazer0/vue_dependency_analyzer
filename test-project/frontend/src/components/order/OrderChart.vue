<template>
  <div class="order-orderChart">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-table />
    <product-gallery />
    <auth-error />
    </div>
    <button @click="emit('close')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useSearchStore } from '@/stores/searchStore'
import { useGeolocation } from '@/composables/useGeolocation'
import { useToast } from '@/composables/useToast'
import { storage } from '@/services/storage'
import axios from 'axios'
import UserTable from '@/components/user/UserTable.vue'
import ProductGallery from '@/components/product/ProductGallery.vue'
import AuthError from '@/components/auth/AuthError.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['close', 'change'])

  const userStore = useUserStore()
  const searchStore = useSearchStore()


  const geolocation = useGeolocation()
  const toast = useToast()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/products/${props.id}`)
    const response1 = await axios.get('/api/products')
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
.order-orderChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
