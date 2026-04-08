<template>
  <div class="user-userPopover">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <filter-panel />
    <login-form />
    <product-wishlist />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useDebounce } from '@/composables/useDebounce'
import axios from 'axios'
import FilterPanel from '@/components/common/FilterPanel.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
import ProductWishlist from '@/components/product/ProductWishlist.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const orderStore = useOrderStore()
  const debounce = useDebounce()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${id}`)
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
.user-userPopover {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
