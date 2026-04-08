<script setup lang="ts">


const emit = defineEmits(['captured', 'error'])
function nativeAction0() {
  window.NativeApp.openCamera()
}
function nativeAction1() {
  window.AndroidBridge.takePhoto()
}
function nativeAction2() {
  window.iOSBridge.captureImage()
}
</script>

<template>
  <div class="cameracapture">
    <h2>{{ 'CameraCapture' }}</h2>


  </div>
</template>
