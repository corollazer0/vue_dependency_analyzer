<template>
  <div class="view-productListView">
    <h1>ProductList</h1>
    <div class="view-content">
    <user-groups />
    <user-avatar />
    <user-profile />
    <user-grid />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useClipboard } from '@/composables/useClipboard'
import axios from 'axios'
import UserGroups from '@/components/user/UserGroups.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import UserProfile from '@/components/user/UserProfile.vue'
import UserGrid from '@/components/user/UserGrid.vue'

const route = useRoute()
const router = useRouter()
  const userStore = useUserStore()
  const clipboard = useClipboard()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.post('/api/orders')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-productListView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
