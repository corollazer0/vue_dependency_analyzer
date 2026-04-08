<script setup lang="ts">


const emit = defineEmits(['shared'])
function nativeAction0() {
  window.NativeApp.share("title", "url")
}
function nativeAction1() {
  window.AndroidBridge.shareContent("data")
}
function nativeAction2() {
  window.iOSBridge.shareVia("airdrop")
}
</script>

<template>
  <div class="sharesheet">
    <h2>{{ 'ShareSheet' }}</h2>


  </div>
</template>
