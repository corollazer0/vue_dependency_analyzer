<template>
  <div class="common-appBreadcrumb">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-export />
    <user-list />
    <product-sku />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import ProductExport from '@/components/product/ProductExport.vue'
import UserList from '@/components/user/UserList.vue'
import ProductSku from '@/components/product/ProductSku.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const userStore = useUserStore()


  const auth = useAuth()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.put('/api/settings')
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
.common-appBreadcrumb {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
