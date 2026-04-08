<template>
  <div class="common-appHeader">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <search-bar @search="handleSearch" @clear="handleClear" />
    <product-discount />
    <token-refresh />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useProductStore } from '@/stores/productStore'
import { useCart } from '@/composables/useCart'
import { useAsync } from '@/composables/useAsync'
import { validators } from '@/utils/validators'
import axios from 'axios'
import SearchBar from '@/components/common/SearchBar.vue'
import ProductDiscount from '@/components/product/ProductDiscount.vue'
import TokenRefresh from '@/components/auth/TokenRefresh.vue'

const props = defineProps({
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const cartStore = useCartStore()
  const productStore = useProductStore()


  const cart = useCart()
  const async = useAsync()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.delete(`/api/users/${props.id}`)
    const response1 = await axios.put(`/api/users/${props.id}`)
    data.value = response1.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}

  function handleSearch() {
    console.log('search event received')
  }

  function handleClear() {
    console.log('clear event received')
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
