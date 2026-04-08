<template>
  <div class="product-productSort">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-sidebar />
    <user-list />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useProductStore } from '@/stores/productStore'
import { useProduct } from '@/composables/useProduct'
import { useOrder } from '@/composables/useOrder'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import AppSidebar from '@/components/common/AppSidebar.vue'
import UserList from '@/components/user/UserList.vue'

const props = defineProps({
  items: { type: String, default: '' },
  size: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['close', 'delete'])

  const uIStore = useUIStore()
  const productStore = useProductStore()
  const product = useProduct()
  const order = useOrder()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${id}`)
    const response = await axios.get('/api/users')
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
.product-productSort {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
