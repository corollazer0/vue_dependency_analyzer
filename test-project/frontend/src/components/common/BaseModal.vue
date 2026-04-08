<template>
  <div class="common-baseModal">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ip-whitelist />
    <product-wishlist />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUser } from '@/composables/useUser'
import { useToast } from '@/composables/useToast'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import IpWhitelist from '@/components/auth/IpWhitelist.vue'
import ProductWishlist from '@/components/product/ProductWishlist.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['close', 'delete'])

  const searchStore = useSearchStore()
  const notificationStore = useNotificationStore()
  const user = useUser()
  const toast = useToast()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/settings')
    const response = await axios.get('/api/orders')
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
.common-baseModal {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
