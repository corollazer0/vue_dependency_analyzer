<template>
  <div class="product-productGallery">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <role-guard />
    <metric-card />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useForm } from '@/composables/useForm'
import { useClickOutside } from '@/composables/useClickOutside'
import { orders } from '@/api/orders'
import axios from 'axios'
import RoleGuard from '@/components/auth/RoleGuard.vue'
import MetricCard from '@/components/dashboard/MetricCard.vue'

const props = defineProps({
  items: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['submit', 'delete'])

  const settingsStore = useSettingsStore()
  const inventoryStore = useInventoryStore()
  const form = useForm()
  const clickOutside = useClickOutside()
  provide('config', ref('value'))


const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/users')
    const response = await axios.get('/api/notifications')
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
.product-productGallery {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
