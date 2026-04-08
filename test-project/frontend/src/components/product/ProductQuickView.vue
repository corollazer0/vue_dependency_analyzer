<template>
  <div class="product-productQuickView">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-popover />
    <user-list />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '@/stores/orderStore'
import { useUser } from '@/composables/useUser'
import axios from 'axios'
import UserPopover from '@/components/user/UserPopover.vue'
import UserList from '@/components/user/UserList.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  loading: { type: String, default: '' },
  size: { type: String, default: '' }
})

const emit = defineEmits(['change'])

  const orderStore = useOrderStore()
  const user = useUser()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/settings')
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
.product-productQuickView {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
