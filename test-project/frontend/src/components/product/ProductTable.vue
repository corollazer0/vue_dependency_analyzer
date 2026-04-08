<template>
  <div class="product-productTable">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-alert />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cartStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useValidation } from '@/composables/useValidation'
import { useDarkMode } from '@/composables/useDarkMode'
import { deepClone } from '@/utils/deepClone'
import axios from 'axios'
import BaseAlert from '@/components/common/BaseAlert.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'change'])

  const cartStore = useCartStore()
  const inventoryStore = useInventoryStore()


  const validation = useValidation()
  const darkMode = useDarkMode()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/orders/${props.id}`)
    const response1 = await axios.get(`/api/products/${props.id}/reviews`)
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
.product-productTable {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
