<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const { isLoggedIn, login, logout } = useAuth()
const emit = defineEmits(['authenticated', 'failed'])
function nativeAction0() {
  window.NativeApp.requestBiometric()
}
function nativeAction1() {
  window.AndroidBridge.fingerprint()
}
function nativeAction2() {
  window.iOSBridge.faceId()
}
</script>

<template>
  <div class="biometricauth">
    <h2>{{ 'BiometricAuth' }}</h2>


  </div>
</template>
