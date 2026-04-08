<script setup lang="ts">


const emit = defineEmits(['success', 'error'])
function nativeAction0() {
  window.NativeApp.openCamera()
}
</script>

<template>
  <div class="baseupload">
    <h2>{{ 'BaseUpload' }}</h2>


  </div>
</template>
