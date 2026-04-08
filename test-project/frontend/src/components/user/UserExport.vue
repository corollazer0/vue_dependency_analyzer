<template>
  <div class="user-userExport">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-review />
    <user-search />
    <user-modal />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useUserStore } from '@/stores/userStore'
import { useGeolocation } from '@/composables/useGeolocation'
import { useAsync } from '@/composables/useAsync'
import { analytics } from '@/services/analytics'
import axios from 'axios'
import ProductReview from '@/components/product/ProductReview.vue'
import UserSearch from '@/components/user/UserSearch.vue'
import UserModal from '@/components/user/UserModal.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update', 'submit'])

  const wishlistStore = useWishlistStore()
  const userStore = useUserStore()
  const geolocation = useGeolocation()
  const async = useAsync()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/orders/${id}/cancel`)
    const response = await axios.put('/api/settings')
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.user-userExport {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
