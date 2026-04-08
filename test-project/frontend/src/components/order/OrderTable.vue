<template>
  <div class="order-orderTable">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <icon-wrapper />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { useFilter } from '@/composables/useFilter'
import { useValidation } from '@/composables/useValidation'
import { i18n } from '@/services/i18n'
import axios from 'axios'
import IconWrapper from '@/components/common/IconWrapper.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const userStore = useUserStore()
  const authStore = useAuthStore()
  const filter = useFilter()
  const validation = useValidation()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/wishlist')
    const response = await axios.get('/api/products')
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
.order-orderTable {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
