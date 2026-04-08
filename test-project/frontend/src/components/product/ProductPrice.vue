<template>
  <div class="product-productPrice">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <order-shipping />
    <user-tags />
    <user-profile />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'
import OrderShipping from '@/components/order/OrderShipping.vue'
import UserTags from '@/components/user/UserTags.vue'
import UserProfile from '@/components/user/UserProfile.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  loading: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const inventoryStore = useInventoryStore()
  const permission = usePermission()



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
.product-productPrice {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
