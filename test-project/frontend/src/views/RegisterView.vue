<template>
  <div class="view-registerView">
    <h1>Register</h1>
    <div class="view-content">
    <user-activity />
    <user-grid />
    <user-preferences />
    <user-contacts />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/uIStore'
import { useSearch } from '@/composables/useSearch'
import axios from 'axios'
import UserActivity from '@/components/user/UserActivity.vue'
import UserGrid from '@/components/user/UserGrid.vue'
import UserPreferences from '@/components/user/UserPreferences.vue'
import UserContacts from '@/components/user/UserContacts.vue'

const route = useRoute()
const router = useRouter()
  const uIStore = useUIStore()
  const search = useSearch()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.get('/api/products')
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
