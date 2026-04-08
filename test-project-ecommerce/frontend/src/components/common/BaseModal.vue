<script setup lang="ts">
import { provide as vueProvide, inject as vueInject, ref } from 'vue'

vueProvide('modalState', ref('value'))
const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <div class="basemodal">
    <h2>{{ 'BaseModal' }}</h2>


  </div>
</template>
