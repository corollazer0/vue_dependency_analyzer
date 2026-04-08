<template>
  <div class="user-userCard">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <date-range-selector />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useCouponStore } from '@/stores/couponStore'
import { useCart } from '@/composables/useCart'
import { useKeyboard } from '@/composables/useKeyboard'
import { interceptors } from '@/api/interceptors'
import axios from 'axios'
import DateRangeSelector from '@/components/dashboard/DateRangeSelector.vue'

const props = defineProps({
  title: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const userStore = useUserStore()
  const couponStore = useCouponStore()

  const router = useRouter()
  const cart = useCart()
  const keyboard = useKeyboard()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/notifications')
    const response1 = await axios.put('/api/settings')
    data.value = response1.data
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoading.value = false
  }
}


  function goToUser(userId: number) { router.push(`/users/${userId}`) }

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.user-userCard {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
