<template>
  <div class="user-userAvatar">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <otp-input />
    <base-card />
    </div>
    <button @click="emit('select')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { useCart } from '@/composables/useCart'
import { useSearch } from '@/composables/useSearch'
import { validators } from '@/utils/validators'
import axios from 'axios'
import OtpInput from '@/components/auth/OtpInput.vue'
import BaseCard from '@/components/common/BaseCard.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['select', 'delete'])

  const userStore = useUserStore()
  const cartStore = useCartStore()


  const cart = useCart()
  const search = useSearch()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/auth/register')
    const response1 = await axios.delete(`/api/users/${props.id}`)
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
.user-userAvatar {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
