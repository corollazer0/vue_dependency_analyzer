<script setup lang="ts">
import { useNativeBridge } from '@/composables/useNativeBridge'

const { isNative, openCamera, share, hapticFeedback } = useNativeBridge()
function nativeAction0() {
  window.NativeApp.getDeviceInfo()
}
function nativeAction1() {
  window.AndroidBridge.getAppVersion()
}
</script>

<template>
  <div class="nativebridge">
    <h2>{{ 'NativeBridge' }}</h2>


  </div>
</template>
