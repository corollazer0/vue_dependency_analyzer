<template>
  <div class="view-checkoutView">
    <h1>Checkout</h1>
    <div class="view-content">
    <user-list />
    <user-form />
    <user-drawer />
    <user-roles />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useClickOutside } from '@/composables/useClickOutside'
import axios from 'axios'
import UserList from '@/components/user/UserList.vue'
import UserForm from '@/components/user/UserForm.vue'
import UserDrawer from '@/components/user/UserDrawer.vue'
import UserRoles from '@/components/user/UserRoles.vue'

const route = useRoute()
const router = useRouter()
  const settingsStore = useSettingsStore()
  const clickOutside = useClickOutside()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.delete(`/api/users/${route.params.id}`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-checkoutView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
