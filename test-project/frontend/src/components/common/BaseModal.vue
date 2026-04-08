<template>
  <div class="common-baseModal">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <auth-guard />
    <product-detail />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePermission } from '@/composables/usePermission'
import { useWebSocket } from '@/composables/useWebSocket'
import { formatCurrency } from '@/utils/formatCurrency'
import axios from 'axios'
import AuthGuard from '@/components/auth/AuthGuard.vue'
import ProductDetail from '@/components/product/ProductDetail.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const uIStore = useUIStore()
  const settingsStore = useSettingsStore()


  const permission = usePermission()
  const webSocket = useWebSocket()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/products/${props.id}`)
    const response1 = await axios.put(`/api/users/${props.id}`)
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
.common-baseModal {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
