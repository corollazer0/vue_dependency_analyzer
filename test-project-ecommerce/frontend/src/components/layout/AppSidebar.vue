<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { provide as vueProvide, inject as vueInject, ref } from 'vue'

const uiStore = useUiStore()
const { sidebarCollapsed, theme } = storeToRefs(uiStore)
const authStore = useAuthStore()
const { token, user } = storeToRefs(authStore)
const { permission } = usePermission()
const router = useRouter()
function navigate() { router.push('/dashboard') }
const layoutStateValue = vueInject('layoutState')
</script>

<template>
  <div class="appsidebar">
    <h2>{{ 'AppSidebar' }}</h2>


  </div>
</template>
