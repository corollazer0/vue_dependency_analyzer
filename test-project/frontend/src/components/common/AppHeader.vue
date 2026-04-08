<template>
  <div class="common-appHeader">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-avatar />
    <product-wishlist />
    <user-drawer />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuth } from '@/composables/useAuth'
import { useDarkMode } from '@/composables/useDarkMode'
import { constants } from '@/utils/constants'
import axios from 'axios'
import BaseAvatar from '@/components/common/BaseAvatar.vue'
import ProductWishlist from '@/components/product/ProductWishlist.vue'
import UserDrawer from '@/components/user/UserDrawer.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const uIStore = useUIStore()
  const settingsStore = useSettingsStore()
  const auth = useAuth()
  const darkMode = useDarkMode()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
    const response = await axios.get(`/api/orders/${id}`)
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
.common-appHeader {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
