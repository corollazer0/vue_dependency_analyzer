<script setup lang="ts">
import { ref, provide, inject } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useAuth } from '@/composables/useAuth'
import ChildComponent from './ChildComponent.vue'
import BaseButton from '@/components/BaseButton.vue'
import axios from 'axios'

const userStore = useUserStore()
const { isLoggedIn } = useAuth()

const count = ref(0)

provide('theme', 'dark')
const locale = inject('locale')

const props = defineProps({
  title: String,
  count: Number,
})

const emit = defineEmits(['update', 'close'])

async function fetchUsers() {
  const res = await axios.get('/api/users')
  return res.data
}

async function createUser(name: string) {
  await axios.post('/api/users', { name })
}

function callNative() {
  window.AndroidBridge.showToast('Hello')
}
</script>

<template>
  <div>
    <h1>{{ title }}</h1>
    <ChildComponent :data="count" />
    <base-button @click="fetchUsers">Fetch</base-button>
    <custom-dialog v-if="isLoggedIn">
      <p v-highlight>Content</p>
    </custom-dialog>
  </div>
</template>
