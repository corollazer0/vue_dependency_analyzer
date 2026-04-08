<script setup lang="ts">


const emit = defineEmits(['scanned', 'error'])
function nativeAction0() {
  window.NativeApp.openScanner()
}
function nativeAction1() {
  window.AndroidBridge.scanBarcode()
}
function nativeAction2() {
  window.iOSBridge.scanQR()
}
</script>

<template>
  <div class="nativescanner">
    <h2>{{ 'NativeScanner' }}</h2>


  </div>
</template>
