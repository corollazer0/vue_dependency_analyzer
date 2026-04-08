<template>
  <div class="view-registerView">
    <h1>Register</h1>
    <div class="view-content">
    <user-modal />
    <user-popover />
    <user-preferences />
    <user-notifications />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/uIStore'
import { usePermission } from '@/composables/usePermission'
import axios from 'axios'
import UserModal from '@/components/user/UserModal.vue'
import UserPopover from '@/components/user/UserPopover.vue'
import UserPreferences from '@/components/user/UserPreferences.vue'
import UserNotifications from '@/components/user/UserNotifications.vue'

const route = useRoute()
const router = useRouter()
  const uIStore = useUIStore()
  const permission = usePermission()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.post('/api/orders')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-registerView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
