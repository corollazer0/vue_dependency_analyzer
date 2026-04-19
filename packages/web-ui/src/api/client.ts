import { ref } from 'vue';

// ─── Auth state ───

const AUTH_TOKEN_KEY = 'vda-auth-token';

export const authRequired = ref(false);
export const authToken = ref<string | null>(localStorage.getItem(AUTH_TOKEN_KEY));

export function setToken(token: string | null) {
  authToken.value = token;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function clearAuth() {
  setToken(null);
  authRequired.value = true;
}

// ─── Central fetch wrapper ───

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);

  if (authToken.value) {
    headers.set('Authorization', `Bearer ${authToken.value}`);
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    throw new ApiAuthError('Authentication required');
  }

  return res;
}

export class ApiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

// ─── Auth check on startup ───

export async function checkAuthStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {},
    });
    if (res.status === 401) {
      clearAuth();
      return false;
    }
    const data = await res.json();
    if (data.authEnabled && !data.user) {
      authRequired.value = true;
      return false;
    }
    authRequired.value = false;
    return true;
  } catch {
    // Server not reachable — don't block, auth check will fail on first API call
    return true;
  }
}

// ─── Login ───

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setToken(data.token);
      authRequired.value = false;
      return { success: true };
    }
    if (data.token === null && data.message === 'Authentication is disabled') {
      // Auth not enabled on server
      authRequired.value = false;
      return { success: true };
    }
    return { success: false, error: data.error || 'Login failed' };
  } catch (e) {
    return { success: false, error: 'Server unreachable' };
  }
}

export function logout() {
  clearAuth();
}

// ─── WebSocket with auth ───

export function createAuthWebSocket(path: string): WebSocket {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  let wsUrl = `${protocol}//${location.host}${path}`;
  if (authToken.value) {
    wsUrl += `?token=${encodeURIComponent(authToken.value)}`;
  }
  return new WebSocket(wsUrl);
}
