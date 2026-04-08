<script setup lang="ts">


const props = defineProps<{ images: string }>()
function nativeAction0() {
  window.AndroidBridge.openDeepLink("gallery")
}
</script>

<template>
  <div class="productimagegallery">
    <h2>{{ 'ProductImageGallery' }}</h2>


  </div>
</template>
