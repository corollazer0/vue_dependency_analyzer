<template>
  <div class="auth-ipWhitelist">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-profile />
    <user-settings />
    <product-card />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'
import UserProfile from '@/components/user/UserProfile.vue'
import UserSettings from '@/components/user/UserSettings.vue'
import ProductCard from '@/components/product/ProductCard.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const wishlistStore = useWishlistStore()
  const permission = usePermission()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/products')
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
.auth-ipWhitelist {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
