<template>
  <div class="auth-sessionTimeout">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-filter />
    <user-activity />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useSearch } from '@/composables/useSearch'
import { useGeolocation } from '@/composables/useGeolocation'
import { endpoints } from '@/api/endpoints'
import axios from 'axios'
import UserFilter from '@/components/user/UserFilter.vue'
import UserActivity from '@/components/user/UserActivity.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const cartStore = useCartStore()
  const wishlistStore = useWishlistStore()


  const search = useSearch()
  const geolocation = useGeolocation()

  const localeValue = inject('locale')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/orders')
    const response1 = await axios.get('/api/search')
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
.auth-sessionTimeout {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
