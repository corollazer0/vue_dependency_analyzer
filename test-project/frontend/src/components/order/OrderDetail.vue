<template>
  <div class="order-orderDetail">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-table />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { useSearch } from '@/composables/useSearch'
import { useValidation } from '@/composables/useValidation'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import UserTable from '@/components/user/UserTable.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['select', 'update'])

  const userStore = useUserStore()
  const cartStore = useCartStore()


  const search = useSearch()
  const validation = useValidation()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/dashboard/stats')
    const response1 = await axios.get(`/api/orders/${props.id}`)
    data.value = response1.data
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
.order-orderDetail {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
