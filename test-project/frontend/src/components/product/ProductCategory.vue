<template>
  <div class="product-productCategory">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-item />
    <user-permissions />
    <product-bulk-edit />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useAsync } from '@/composables/useAsync'
import axios from 'axios'
import OrderItem from '@/components/order/OrderItem.vue'
import UserPermissions from '@/components/user/UserPermissions.vue'
import ProductBulkEdit from '@/components/product/ProductBulkEdit.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const searchStore = useSearchStore()
  const async = useAsync()



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
.product-productCategory {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
