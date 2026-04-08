<script setup lang="ts">
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'

const notificationStore = useNotificationStore()
const { messages, unreadCount } = storeToRefs(notificationStore)
function nativeAction0() {
  window.NativeApp.registerPush("token")
}
function nativeAction1() {
  window.iOSBridge.requestPushPermission()
}
function nativeAction2() {
  window.AndroidBridge.getFcmToken()
}
</script>

<template>
  <div class="pushnotification">
    <h2>{{ 'PushNotification' }}</h2>


  </div>
</template>
