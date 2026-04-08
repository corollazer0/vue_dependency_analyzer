<script setup lang="ts">
import { provide as vueProvide, inject as vueInject, ref } from 'vue'

const modalStateValue = vueInject('modalState')
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div class="confirmdialog">
    <h2>{{ 'ConfirmDialog' }}</h2>


  </div>
</template>
