import { AuthService } from '$lib/services/auth.service';
import { getJwtExpiration } from '$lib/utils/jwt';

class AuthStore {
  accessToken = $state<string | null>(null);
  isLoading = $state(true);
  isExpired = $state(false);
  isAuthenticated = $derived(!!this.accessToken && !this.isExpired);
  
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  async init() {
    this.isLoading = true;
    await this.loadToken();
    this.isLoading = false;
  }

  async loadToken() {
    const token = await AuthService.getAccessToken();
    
    if (token) {
      const exp = getJwtExpiration(token);
      const isNowExpired = exp ? (exp * 1000) <= Date.now() : true;

      if (isNowExpired) {
        console.warn('Token found but it is already expired.');
        this.accessToken = null;
        this.isExpired = true;
        this.startPolling(); // Keep polling, maybe main app will refresh it
      } else {
        this.isExpired = false;
        this.setToken(token);
        this.stopPolling();
      }
    } else {
      this.accessToken = null;
      this.isExpired = false;
      this.startPolling();
    }
  }

  private startPolling() {
    if (this.pollTimer) return;
    
    console.log('Starting auth polling...');
    this.pollTimer = setInterval(async () => {
      const token = await AuthService.getAccessToken();
      if (token) {
        const exp = getJwtExpiration(token);
        const isNowExpired = exp ? (exp * 1000) <= Date.now() : true;
        
        if (!isNowExpired) {
          console.log('Valid token found during polling!');
          this.isExpired = false;
          this.setToken(token);
          this.stopPolling();
        } else {
          // If still expired, we just stay in this state and wait for next interval
          this.isExpired = true;
        }
      }
    }, 5000); // Polling every 5 seconds as a balanced wait time
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.log('Auth polling stopped.');
    }
  }

  private setToken(token: string) {
    this.accessToken = token;
    this.scheduleRefresh(token);
  }

  private scheduleRefresh(token: string) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const exp = getJwtExpiration(token);
    if (!exp) return;

    const expiresInMs = (exp * 1000) - Date.now();
    // Refresh 20 seconds before expiration
    const refreshDelay = Math.max(0, expiresInMs - 20000);

    console.log(`Token expires in ${Math.round(expiresInMs / 1000)}s. Refreshing in ${Math.round(refreshDelay / 1000)}s`);

    this.refreshTimer = setTimeout(() => {
      console.log('Refreshing token from keychain...');
      this.loadToken();
    }, refreshDelay);
  }
}

export const authStore = new AuthStore();
