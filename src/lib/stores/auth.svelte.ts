import { AuthService } from '$lib/services/auth.service';
import { getJwtExpiration } from '$lib/utils/jwt';

class AuthStore {
  accessToken = $state<string | null>(null);
  isLoading = $state(true);
  isExpired = $state(false);
  errorMessage = $state<string | null>(null);
  isAuthenticated = $derived(!!this.accessToken && !this.isExpired);
  
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  async init() {
    this.isLoading = true;
    await this.loadToken();
    this.isLoading = false;
  }

  async loadToken() {
    try {
      const token = await AuthService.getAccessToken();
      this.errorMessage = null; // Clear error if successful

      if (token) {
        const exp = getJwtExpiration(token);
        const isNowExpired = exp ? (exp * 1000) <= Date.now() : true;

        if (isNowExpired) {
          console.warn('Token found but it is already expired.');
          this.accessToken = null;
          this.isExpired = true;
          this.startPolling();
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
    } catch (err: any) {
      this.accessToken = null;
      this.errorMessage = err.toString();
      this.startPolling();
    }
  }

  private startPolling() {
    if (this.pollTimer) return;
    
    console.log('Starting auth polling...');
    this.pollTimer = setInterval(async () => {
      try {
        const token = await AuthService.getAccessToken();
        if (token) {
          const exp = getJwtExpiration(token);
          const isNowExpired = exp ? (exp * 1000) <= Date.now() : true;
          
          if (!isNowExpired) {
            console.log('Valid token found during polling!');
            this.isExpired = false;
            this.errorMessage = null;
            this.setToken(token);
            this.stopPolling();
          } else {
            this.isExpired = true;
          }
        } else {
          // If no token, maybe clear error message if it was a connection issue that is now resolved but still no session
          // Or just leave the last error. 
          // Let's keep it simple for now.
        }
      } catch (err: any) {
        this.errorMessage = err.toString();
      }
    }, 5000);
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
    const refreshDelay = Math.max(0, expiresInMs - 20000);

    console.log(`Token expires in ${Math.round(expiresInMs / 1000)}s. Refreshing in ${Math.round(refreshDelay / 1000)}s`);

    this.refreshTimer = setTimeout(() => {
      console.log('Refreshing token from keychain...');
      this.loadToken();
    }, refreshDelay);
  }
}

export const authStore = new AuthStore();
