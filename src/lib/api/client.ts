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
  
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch (e) { }
    throw new Error(errorMessage);
  }

  if (response.status === 204) return {} as T;

  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text);
  } catch (e) {
    return {} as T;
  }
}
