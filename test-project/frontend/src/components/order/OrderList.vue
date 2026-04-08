<template>
  <div class="order-orderList">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-item @remove="handleRemove" @update-quantity="handleUpdateQuantity" />
    <app-header />
    <user-pagination />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useProduct } from '@/composables/useProduct'
import axios from 'axios'
import OrderItem from '@/components/order/OrderItem.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import UserPagination from '@/components/user/UserPagination.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const productStore = useProductStore()


  const product = useProduct()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/search')
    data.value = response.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}

  function handleRemove() {
    console.log('remove event received')
  }

  function handleUpdateQuantity() {
    console.log('update-quantity event received')
  }


onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.order-orderList {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
