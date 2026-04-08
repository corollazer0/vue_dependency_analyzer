<template>
  <div class="auth-identityVerify">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <pie-chart />
    <user-export />
    <user-bio />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useCartStore } from '@/stores/cartStore'
import { useNotification } from '@/composables/useNotification'
import { useAuth } from '@/composables/useAuth'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import PieChart from '@/components/dashboard/PieChart.vue'
import UserExport from '@/components/user/UserExport.vue'
import UserBio from '@/components/user/UserBio.vue'

const props = defineProps({
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'submit'])

  const uIStore = useUIStore()
  const cartStore = useCartStore()
  const notification = useNotification()
  const auth = useAuth()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.post('/api/users')
    const response = await axios.post('/api/cart/items')
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
.auth-identityVerify {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
