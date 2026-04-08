<template>
  <div class="product-productCategory">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-export />
    <user-export />
    <search-bar />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'
import ProductExport from '@/components/product/ProductExport.vue'
import UserExport from '@/components/user/UserExport.vue'
import SearchBar from '@/components/common/SearchBar.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const userStore = useUserStore()


  const permission = usePermission()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/inventory')
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
.product-productCategory {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
