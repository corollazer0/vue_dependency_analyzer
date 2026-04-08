<template>
  <div class="product-productSku">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <activity-feed />
    <sso-login />
    <ldap-login />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/uIStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useClickOutside } from '@/composables/useClickOutside'
import { useDebounce } from '@/composables/useDebounce'
import { helpers } from '@/utils/helpers'
import axios from 'axios'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import SsoLogin from '@/components/auth/SsoLogin.vue'
import LdapLogin from '@/components/auth/LdapLogin.vue'

const props = defineProps({
  disabled: { type: String, default: '' },
  title: { type: String, default: '' },
  items: { type: String, default: '' },
  variant: { type: String, default: '' }
})

const emit = defineEmits(['close', 'select'])

  const uIStore = useUIStore()
  const settingsStore = useSettingsStore()
  const clickOutside = useClickOutside()
  const debounce = useDebounce()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/wishlist')
    const response = await axios.delete(`/api/users/${id}`)
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
.product-productSku {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
