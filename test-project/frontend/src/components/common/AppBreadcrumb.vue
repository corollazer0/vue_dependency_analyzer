<template>
  <div class="common-appBreadcrumb">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-badge />
    <product-variant />
    <user-roles />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useClickOutside } from '@/composables/useClickOutside'
import axios from 'axios'
import UserBadge from '@/components/user/UserBadge.vue'
import ProductVariant from '@/components/product/ProductVariant.vue'
import UserRoles from '@/components/user/UserRoles.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const wishlistStore = useWishlistStore()
  const clickOutside = useClickOutside()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/notifications/${id}/read`)
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
.common-appBreadcrumb {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
