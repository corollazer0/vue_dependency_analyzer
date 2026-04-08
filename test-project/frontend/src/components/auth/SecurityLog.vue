<template>
  <div class="auth-securityLog">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <base-avatar />
    <base-select />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { useTheme } from '@/composables/useTheme'
import { useCart } from '@/composables/useCart'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import BaseAvatar from '@/components/common/BaseAvatar.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const userStore = useUserStore()
  const cartStore = useCartStore()


  const theme = useTheme()
  const cart = useCart()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get(`/api/users/${props.id}`)
    const response1 = await axios.get('/api/products')
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
.auth-securityLog {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
