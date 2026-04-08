<template>
  <div class="order-orderReceipt">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-popover />
    <user-table />
    <order-export />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useFetch } from '@/composables/useFetch'
import axios from 'axios'
import BasePopover from '@/components/common/BasePopover.vue'
import UserTable from '@/components/user/UserTable.vue'
import OrderExport from '@/components/order/OrderExport.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  title: { type: String, default: '' },
  variant: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['delete'])

  const authStore = useAuthStore()


  const fetch = useFetch()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/orders/${props.id}`)
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
.order-orderReceipt {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
