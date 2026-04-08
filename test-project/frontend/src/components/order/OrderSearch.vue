<template>
  <div class="order-orderSearch">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <sso-login />
    <conversion-chart />
    <gauge-chart />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useNotification } from '@/composables/useNotification'
import axios from 'axios'
import SsoLogin from '@/components/auth/SsoLogin.vue'
import ConversionChart from '@/components/dashboard/ConversionChart.vue'
import GaugeChart from '@/components/dashboard/GaugeChart.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  size: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const userStore = useUserStore()


  const notification = useNotification()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/refresh')
    data.value = response.data
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
.order-orderSearch {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
