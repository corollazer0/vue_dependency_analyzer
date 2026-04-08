<template>
  <div class="dashboard-dashboardFilter">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <icon-wrapper />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCouponStore } from '@/stores/couponStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import IconWrapper from '@/components/common/IconWrapper.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select'])

  const couponStore = useCouponStore()
  const auth = useAuth()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.delete(`/api/products/${id}`)
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
.dashboard-dashboardFilter {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
