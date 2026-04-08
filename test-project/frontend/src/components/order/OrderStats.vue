<template>
  <div class="order-orderStats">
    <h2>{{ title }}</h2>
    <div v-if="loading" class="loading">
      <span>Loading...</span>
    </div>
    <div v-else class="content">
    <ldap-login />
    <user-tags />
    </div>
    <button @click="$emit('submit')">Submit</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useUser } from '@/composables/useUser'
import axios from 'axios'
import LdapLogin from '@/components/auth/LdapLogin.vue'
import UserTags from '@/components/user/UserTags.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: String, default: '' },
  loading: { type: String, default: '' }
})

const emit = defineEmits(['update'])

  const inventoryStore = useInventoryStore()
  const user = useUser()



const loading = ref(false)
const data = ref(null)

async function fetchData() {
  loading.value = true
  try {
    const response = await axios.get('/api/orders')
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
.order-orderStats {
  padding: 16px;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
