<template>
  <div class="auth-authGuard">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <phone-verify />
    <user-onboarding />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useSearch } from '@/composables/useSearch'
import axios from 'axios'
import PhoneVerify from '@/components/auth/PhoneVerify.vue'
import UserOnboarding from '@/components/user/UserOnboarding.vue'

const props = defineProps({
  items: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const wishlistStore = useWishlistStore()
  const search = useSearch()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/wishlist')
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
.auth-authGuard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
