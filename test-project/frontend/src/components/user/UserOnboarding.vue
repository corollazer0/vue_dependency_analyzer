<template>
  <div class="user-userOnboarding">
    <h2>{{ title }}</h2>
    <div v-if="isLoading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ldap-login />
    </div>
    <button @click="emit('delete')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import LdapLogin from '@/components/auth/LdapLogin.vue'

const props = defineProps({
  title: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['delete', 'close'])

  const categoryStore = useCategoryStore()
  const settingsStore = useSettingsStore()


  const infiniteScroll = useInfiniteScroll()
  const mediaQuery = useMediaQuery()

  const permissionsValue = inject('permissions')

const isLoading = ref(false)
const data = ref(null)

async function fetchData() {
  isLoading.value = true
  try {
    const response = await axios.get('/api/dashboard/revenue')
    const response1 = await axios.post('/api/orders')
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
.user-userOnboarding {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
