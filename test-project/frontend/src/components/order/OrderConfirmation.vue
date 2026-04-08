<template>
  <div class="order-orderConfirmation">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-spinner />
    <confirm-dialog />
    <trusted-devices />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useReviewStore } from '@/stores/reviewStore'
import { useUser } from '@/composables/useUser'
import axios from 'axios'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import TrustedDevices from '@/components/auth/TrustedDevices.vue'

const props = defineProps({
  size: { type: String, default: '' },
  variant: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const reviewStore = useReviewStore()
  const user = useUser()

  const eventBusValue = inject('eventBus')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/orders/${id}/status`)
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
.order-orderConfirmation {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
