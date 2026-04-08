<template>
  <div class="dashboard-dateRangeSelector">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <app-footer />
    <product-wishlist />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useCartStore } from '@/stores/cartStore'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useEventBus } from '@/composables/useEventBus'
import { i18n } from '@/services/i18n'
import axios from 'axios'
import AppFooter from '@/components/common/AppFooter.vue'
import ProductWishlist from '@/components/product/ProductWishlist.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'close'])

  const inventoryStore = useInventoryStore()
  const cartStore = useCartStore()
  const breakpoint = useBreakpoint()
  const eventBus = useEventBus()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
    const response = await axios.get('/api/dashboard/stats')
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
.dashboard-dateRangeSelector {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
