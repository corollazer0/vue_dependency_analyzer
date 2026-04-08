<template>
  <div class="order-orderNotification">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-list />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { usePermission } from '@/composables/usePermission'
import { useProduct } from '@/composables/useProduct'
import { auth } from '@/api/auth'
import axios from 'axios'
import UserList from '@/components/user/UserList.vue'

const props = defineProps({
  size: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update', 'change'])

  const searchStore = useSearchStore()
  const settingsStore = useSettingsStore()


  const permission = usePermission()
  const product = useProduct()



const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.delete(`/api/wishlist/${props.id}`)
    const response1 = await axios.get('/api/analytics/conversions')
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
.order-orderNotification {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
