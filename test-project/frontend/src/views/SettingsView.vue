<template>
  <div class="view-settingsView">
    <h1>Settings</h1>
    <div class="view-content">
    <user-timeline />
    <user-list />
    <user-tags />
    <user-permissions />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCouponStore } from '@/stores/couponStore'
import { useDebounce } from '@/composables/useDebounce'
import axios from 'axios'
import UserTimeline from '@/components/user/UserTimeline.vue'
import UserList from '@/components/user/UserList.vue'
import UserTags from '@/components/user/UserTags.vue'
import UserPermissions from '@/components/user/UserPermissions.vue'

const route = useRoute()
const router = useRouter()
  const couponStore = useCouponStore()
  const debounce = useDebounce()

const pageData = ref(null)

function navigateTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  try {
    await axios.post('/api/users')
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-settingsView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
