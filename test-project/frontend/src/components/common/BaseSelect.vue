<template>
  <div class="common-baseSelect">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <api-key-manager />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useFilter } from '@/composables/useFilter'
import axios from 'axios'
import ApiKeyManager from '@/components/auth/ApiKeyManager.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const inventoryStore = useInventoryStore()
  const filter = useFilter()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post(`/api/products/${id}/reviews`)
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
.common-baseSelect {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
