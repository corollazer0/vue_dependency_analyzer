<template>
  <div class="view-profileView">
    <h1>Profile</h1>
    <div class="view-content">
    <user-preferences />
    <user-profile />
    <user-list />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/composables/useAuth'
import axios from 'axios'
import UserPreferences from '@/components/user/UserPreferences.vue'
import UserProfile from '@/components/user/UserProfile.vue'
import UserList from '@/components/user/UserList.vue'

const route = useRoute()
const router = useRouter()
  const authStore = useAuthStore()
  const auth = useAuth()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.put(`/api/products/${route.params.id}`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-profileView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
