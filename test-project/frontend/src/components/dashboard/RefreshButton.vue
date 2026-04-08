<template>
  <div class="dashboard-refreshButton">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-roles />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useToast } from '@/composables/useToast'
import axios from 'axios'
import UserRoles from '@/components/user/UserRoles.vue'

const props = defineProps({
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const orderStore = useOrderStore()
  const toast = useToast()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get(`/api/products/${id}`)
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
.dashboard-refreshButton {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
