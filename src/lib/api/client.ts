import { authStore } from '$lib/stores/auth.svelte';
import { fetch } from '@tauri-apps/plugin-http';

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

let requestIdCounter = 0;

// Global Backoff State
let currentRetryDelay = 0;
let lastRateLimitTime = 0;
const INITIAL_RETRY_DELAY = 2000;
const MAX_RETRY_DELAY = 30000;

export function isBackingOff() {
  if (currentRetryDelay === 0) return false;
  return Date.now() - lastRateLimitTime < currentRetryDelay;
}

export function handleRateLimit() {
  const now = Date.now();
  // Only increase if it's a "fresh" rate limit (not a duplicate trigger within 1s)
  if (now - lastRateLimitTime > 1000) {
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
  private MIN_GAP_MS = 1000; // 1s gap between successful requests

  async waitAndExecute<T>(fn: () => Promise<T>): Promise<T> {
    // 1. Wait for previous request to finish its network turn
    while (this.activeRequest) {
      await this.activeRequest;
    }

    // 2. Enforce global backoff if active
    while (isBackingOff()) {
      const waitTime = currentRetryDelay - (Date.now() - lastRateLimitTime);
      if (waitTime > 0) {
        console.log(`[API] Waiting ${waitTime}ms for backoff to clear...`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }

    // 3. Enforce mandatory gap after the last request
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestFinishTime;
    if (timeSinceLast < this.MIN_GAP_MS) {
      await new Promise(r => setTimeout(r, this.MIN_GAP_MS - timeSinceLast));
    }

    // Set as active
    let resolveActive: (value: any) => void;
    this.activeRequest = new Promise(resolve => { resolveActive = resolve; });

    try {
      const result = await fn();
      // On any success, we clear the backoff
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
  const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];

  return throttler.waitAndExecute(async () => {
    console.log(`[API][${reqId}][${timestamp}] ${method} ${endpoint} - Start`);
    
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
          handleRateLimit(); // Trigger global backoff immediately
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
      console.error(`[API][${reqId}] ${method} ${endpoint} - Failed: ${err.message}`);
      throw err;
    }
  });
}
