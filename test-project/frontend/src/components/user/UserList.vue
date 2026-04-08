<template>
  <div class="user-userList">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-sidebar />
    <product-wishlist />
    <user-search />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useFetch } from '@/composables/useFetch'
import axios from 'axios'
import AppSidebar from '@/components/common/AppSidebar.vue'
import ProductWishlist from '@/components/product/ProductWishlist.vue'
import UserSearch from '@/components/user/UserSearch.vue'

const props = defineProps({
  items: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const productStore = useProductStore()


  const fetch = useFetch()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.delete(`/api/cart/items/${props.id}`)
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
.user-userList {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
