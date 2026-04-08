<template>
  <div class="common-dataError">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <product-badge />
    <user-settings />
    <user-activity />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useForm } from '@/composables/useForm'
import axios from 'axios'
import ProductBadge from '@/components/product/ProductBadge.vue'
import UserSettings from '@/components/user/UserSettings.vue'
import UserActivity from '@/components/user/UserActivity.vue'

const props = defineProps({
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  size: { type: String, default: '' },
  disabled: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const userStore = useUserStore()


  const form = useForm()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/analytics/conversions')
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
.common-dataError {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
