import { authStore } from '$lib/stores/auth.svelte';
import { fetch } from '@tauri-apps/plugin-http';

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

let requestIdCounter = 0;

// Global Backoff State
let currentRetryDelay = 0;
let lastRateLimitTime = 0;
const INITIAL_RETRY_DELAY = 5000; 
const MAX_RETRY_DELAY = 60000;    

export function isBackingOff() {
  if (currentRetryDelay === 0) return false;
  return Date.now() - lastRateLimitTime < currentRetryDelay;
}

export function handleRateLimit() {
  const now = Date.now();
  if (now - lastRateLimitTime > 2000) {
    lastRateLimitTime = now;
    if (currentRetryDelay === 0) {
      currentRetryDelay = INITIAL_RETRY_DELAY;
    } else {
      currentRetryDelay = Math.min(currentRetryDelay * 2, MAX_RETRY_DELAY);
    }
    console.warn(`[API] Global backoff increased to ${currentRetryDelay}ms`);
  }
}

export function resetBackoff() {
  if (currentRetryDelay > 0) {
    console.log('[API] Global backoff cleared.');
    currentRetryDelay = 0;
  }
}

class GlobalThrottler {
  private activeRequest: Promise<any> | null = null;
  private lastRequestFinishTime = 0;
  private MIN_GAP_MS = 800; // Slightly faster but still safe

  async waitAndExecute<T>(fn: () => Promise<T>): Promise<T> {
    while (this.activeRequest) {
      await this.activeRequest;
    }

    while (isBackingOff()) {
      const waitTime = currentRetryDelay - (Date.now() - lastRateLimitTime);
      if (waitTime > 0) {
        await new Promise(r => setTimeout(r, waitTime));
      } else {
        break;
      }
    }

    const now = Date.now();
    const timeSinceLast = now - this.lastRequestFinishTime;
    if (timeSinceLast < this.MIN_GAP_MS) {
      await new Promise(r => setTimeout(r, this.MIN_GAP_MS - timeSinceLast));
    }

    let resolveActive: (value: any) => void;
    this.activeRequest = new Promise(resolve => { resolveActive = resolve; });

    try {
      const result = await fn();
      resetBackoff();
      return result;
    } finally {
      this.lastRequestFinishTime = Date.now();
      this.activeRequest = null;
      resolveActive!(null);
    }
  }
}

const throttler = new GlobalThrottler();

export async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const reqId = ++requestIdCounter;
  const method = options.method || 'GET';
  const timestamp = new Date().toLocaleTimeString();

  return throttler.waitAndExecute(async () => {
    console.log(`[API][${reqId}][${timestamp}] ${method} ${endpoint} - Sending...`);
    
    const { params, ...init } = options;
    let baseUrl = authStore.serverUrl || 'http://localhost';
    
    if (!baseUrl.endsWith('/api/v1') && !baseUrl.endsWith('/api/v1/')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/api/v1';
    }

    const url = new URL(`${baseUrl}${endpoint}`);
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

    try {
      const response = await fetch(url.toString(), {
        ...init,
        headers,
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.error(`[API][${reqId}] 429 Rate Limit on ${endpoint}`);
          handleRateLimit();
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
        
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
      }

      console.log(`[API][${reqId}] ${method} ${endpoint} - Success`);

      if (response.status === 204) return {} as T;
      const text = await response.text();
      if (!text) return {} as T;

      try {
        return JSON.parse(text);
      } catch (e) {
        return {} as T;
      }
    } catch (err: any) {
      if (err.message !== 'RATE_LIMIT_EXCEEDED') {
        console.error(`[API][${reqId}] ${method} ${endpoint} - Error: ${err.message}`);
      }
      throw err;
    }
  });
}
