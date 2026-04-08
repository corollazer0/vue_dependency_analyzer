<script setup lang="ts">


const props = defineProps<{ latitude: string; longitude: string }>()
function nativeAction0() {
  window.NativeApp.openMap()
}
function nativeAction1() {
  window.AndroidBridge.showGoogleMaps()
}
function nativeAction2() {
  window.iOSBridge.showAppleMaps()
}
</script>

<template>
  <div class="nativemap">
    <h2>{{ 'NativeMap' }}</h2>


  </div>
</template>
