<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useNativeBridge } from '@/composables/useNativeBridge'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const { token, user } = storeToRefs(authStore)
const notificationStore = useNotificationStore()
const { messages, unreadCount } = storeToRefs(notificationStore)
const { isNative, openCamera, share, hapticFeedback } = useNativeBridge()
const router = useRouter()
function navigate() { router.push('/profile') }
function nativeAction0() {
  window.NativeApp.getDeviceInfo()
}
</script>

<template>
  <div class="appheader">
    <h2>{{ 'AppHeader' }}</h2>


  </div>
</template>
