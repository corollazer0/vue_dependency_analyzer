<template>
  <div class="product-productComparison">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <data-error />
    <order-confirmation />
    <user-settings />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useDragDrop } from '@/composables/useDragDrop'
import axios from 'axios'
import DataError from '@/components/common/DataError.vue'
import OrderConfirmation from '@/components/order/OrderConfirmation.vue'
import UserSettings from '@/components/user/UserSettings.vue'

const props = defineProps({
  title: { type: String, default: '' },
  loading: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['submit'])

  const userStore = useUserStore()
  const dragDrop = useDragDrop()

  const themeValue = inject('theme')

const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.put(`/api/users/${id}`)
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
.product-productComparison {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
