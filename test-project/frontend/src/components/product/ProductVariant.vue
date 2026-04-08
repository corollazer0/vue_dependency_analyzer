<template>
  <div class="product-productVariant">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-alert />
    <user-stats />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useDarkMode } from '@/composables/useDarkMode'
import axios from 'axios'
import BaseAlert from '@/components/common/BaseAlert.vue'
import UserStats from '@/components/user/UserStats.vue'

const props = defineProps({
  size: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['close'])

  const inventoryStore = useInventoryStore()
  const darkMode = useDarkMode()



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
.product-productVariant {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
