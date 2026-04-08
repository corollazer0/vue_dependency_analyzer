<template>
  <div class="product-productSearch">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-modal />
    <user-grid />
    <user-form />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useProduct } from '@/composables/useProduct'
import { useAsync } from '@/composables/useAsync'
import { auth } from '@/api/auth'
import axios from 'axios'
import UserModal from '@/components/user/UserModal.vue'
import UserGrid from '@/components/user/UserGrid.vue'
import UserForm from '@/components/user/UserForm.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const productStore = useProductStore()
  const inventoryStore = useInventoryStore()


  const product = useProduct()
  const async = useAsync()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/settings')
    const response1 = await axios.get('/api/users')
    data.value = response1.data
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
.product-productSearch {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
