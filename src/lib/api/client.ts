import { authStore } from '$lib/stores/auth.svelte';
import { fetch } from '@tauri-apps/plugin-http';

const BASE_URL = 'http://localhost/api/v1';

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

export async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...init } = options;
  
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  }

  const headers = new Headers(init.headers);
  if (authStore.accessToken) {
    headers.set('Authorization', `Bearer ${authStore.accessToken}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url.toString(), {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      console.error('Unauthorized request');
    }
    const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorBody.message || `HTTP ${response.status}`);
  }

  return response.json();
}
