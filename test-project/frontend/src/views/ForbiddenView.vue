<template>
  <div class="view-forbiddenView">
    <h1>Forbidden</h1>
    <div class="view-content">
    <data-empty />
    <base-dropdown />
    <base-badge />
    <base-spinner />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useValidation } from '@/composables/useValidation'
import axios from 'axios'
import DataEmpty from '@/components/common/DataEmpty.vue'
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'

const route = useRoute()
const router = useRouter()
  const userStore = useUserStore()
  const validation = useValidation()

const pageData = ref(null)

onMounted(async () => {
  try {
    await axios.get(`/api/products/${route.params.id}`)
  } catch (error) {
    console.error('View load error:', error)
  }
})
</script>

<style scoped>
.view-forbiddenView {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
