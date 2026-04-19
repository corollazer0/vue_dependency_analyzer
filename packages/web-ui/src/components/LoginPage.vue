<script setup lang="ts">
import { ref } from 'vue';
import { login } from '@/api/client';

const username = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

async function handleLogin() {
  errorMsg.value = '';
  loading.value = true;
  try {
    const result = await login(username.value, password.value);
    if (!result.success) {
      errorMsg.value = result.error || 'Login failed';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="h-screen w-screen flex items-center justify-center" style="background: var(--surface-primary); color: var(--text-primary)">
    <div class="w-80 p-6 rounded-xl" style="background: var(--surface-secondary); border: 1px solid var(--border-subtle)">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold" style="color: var(--accent-vue)">VDA</h1>
        <p class="text-sm mt-1" style="color: var(--text-tertiary)">Vue Dependency Analyzer</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs mb-1" style="color: var(--text-secondary)">Username</label>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style="background: var(--surface-primary); color: var(--text-primary); border: 1px solid var(--border-default)"
            placeholder="admin"
            :disabled="loading"
          />
        </div>
        <div>
          <label class="block text-xs mb-1" style="color: var(--text-secondary)">Password</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style="background: var(--surface-primary); color: var(--text-primary); border: 1px solid var(--border-default)"
            placeholder="Password"
            :disabled="loading"
          />
        </div>

        <div v-if="errorMsg" class="text-xs px-3 py-2 rounded-lg" style="background: rgba(239,68,68,0.1); color: var(--accent-danger)">
          {{ errorMsg }}
        </div>

        <button
          type="submit"
          :disabled="loading || !username || !password"
          class="w-full py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
          style="background: var(--accent-vue); color: var(--text-inverse)"
        >
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>
