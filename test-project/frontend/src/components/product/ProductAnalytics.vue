<template>
  <div class="product-productAnalytics">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-table />
    </div>
    <button @click="emit('change')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { useUser } from '@/composables/useUser'
import { useProduct } from '@/composables/useProduct'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import UserTable from '@/components/user/UserTable.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['change', 'update'])

  const userStore = useUserStore()
  const cartStore = useCartStore()


  const user = useUser()
  const product = useProduct()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/orders/${props.id}`)
    const response1 = await axios.post('/api/auth/login')
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
.product-productAnalytics {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
