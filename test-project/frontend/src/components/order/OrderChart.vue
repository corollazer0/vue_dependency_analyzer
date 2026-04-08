<template>
  <div class="order-orderChart">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <spark-line />
    <base-alert />
    <base-skeleton />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { usePermission } from '@/composables/usePermission'
import { useThrottle } from '@/composables/useThrottle'
import { storage } from '@/services/storage'
import axios from 'axios'
import SparkLine from '@/components/dashboard/SparkLine.vue'
import BaseAlert from '@/components/common/BaseAlert.vue'
import BaseSkeleton from '@/components/common/BaseSkeleton.vue'

const props = defineProps({
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'change'])

  const uIStore = useUIStore()
  const notificationStore = useNotificationStore()
  const permission = usePermission()
  const throttle = useThrottle()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/cart')
    const response = await axios.put(`/api/products/${id}`)
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
.order-orderChart {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
