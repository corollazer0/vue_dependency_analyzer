<script setup lang="ts">
import { useForm } from '@/composables/useForm'

const { form } = useForm()
const emit = defineEmits(['submit', 'cancel', 'validate'])
</script>

<template>
  <div class="baseform">
    <h2>{{ 'BaseForm' }}</h2>


  </div>
</template>
