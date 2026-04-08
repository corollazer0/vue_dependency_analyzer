<template>
  <div class="user-userSearch">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <user-popover />
    <base-tabs />
    </div>
    <button @click="emit('update')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useUserStore } from '@/stores/userStore'
import { useTheme } from '@/composables/useTheme'
import { useUser } from '@/composables/useUser'
import { formatDate } from '@/utils/formatDate'
import axios from 'axios'
import UserPopover from '@/components/user/UserPopover.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'

const props = defineProps({
  title: { type: String, default: '' },
  disabled: { type: String, default: '' },
  items: { type: String, default: '' }
})

const emit = defineEmits(['update', 'close'])

  const inventoryStore = useInventoryStore()
  const userStore = useUserStore()


  const theme = useTheme()
  const user = useUser()
  provide('eventBus', ref('value'))


const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.delete(`/api/users/${props.id}`)
    const response1 = await axios.put('/api/settings')
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
.user-userSearch {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
