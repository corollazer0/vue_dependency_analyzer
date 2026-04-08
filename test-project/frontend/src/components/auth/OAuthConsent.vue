<template>
  <div class="auth-oAuthConsent">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-sort />
    <user-stats />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useOrder } from '@/composables/useOrder'
import axios from 'axios'
import UserSort from '@/components/user/UserSort.vue'
import UserStats from '@/components/user/UserStats.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  loading: { type: String, default: '' },
  title: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const inventoryStore = useInventoryStore()
  const order = useOrder()

  const localeValue = inject('locale')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/inventory/${id}`)
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
.auth-oAuthConsent {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
