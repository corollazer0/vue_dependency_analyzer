<template>
  <div class="common-basePopover">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-error />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useProductStore } from '@/stores/productStore'
import { useProduct } from '@/composables/useProduct'
import { useTheme } from '@/composables/useTheme'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import AuthError from '@/components/auth/AuthError.vue'

const props = defineProps({
  items: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'delete'])

  const orderStore = useOrderStore()
  const productStore = useProductStore()
  const product = useProduct()
  const theme = useTheme()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${id}`)
    const response = await axios.get('/api/settings')
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
.common-basePopover {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
