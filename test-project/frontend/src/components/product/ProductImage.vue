<template>
  <div class="product-productImage">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <dashboard-widget />
    <captcha-widget />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useCouponStore } from '@/stores/couponStore'
import { useSearch } from '@/composables/useSearch'
import { useUser } from '@/composables/useUser'
import { auth } from '@/api/auth'
import axios from 'axios'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import CaptchaWidget from '@/components/auth/CaptchaWidget.vue'

const props = defineProps({
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['update', 'delete'])

  const uIStore = useUIStore()
  const couponStore = useCouponStore()


  const search = useSearch()
  const user = useUser()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.post('/api/users')
    const response1 = await axios.put(`/api/products/${props.id}`)
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
.product-productImage {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
