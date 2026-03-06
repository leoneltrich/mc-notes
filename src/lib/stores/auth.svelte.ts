import { AuthService } from '$lib/services/auth.service';
import { ConfigService } from '$lib/services/config.service';
import { getJwtExpiration, getUserIdFromToken } from '$lib/utils/jwt';

class AuthStore {
  accessToken = $state<string | null>(null);
  serverUrl = $state<string | null>(null);
  isLoading = $state(true);
  isExpired = $state(false);
  
  isAppRunning = $state(true); 
  hasSession = $state(true);   
  technicalError = $state<string | null>(null);
  
  isAuthenticated = $derived(!!this.accessToken && !this.isExpired);
  userId = $derived(this.accessToken ? getUserIdFromToken(this.accessToken) : null);
  
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  async init() {
    this.isLoading = true;
    try {
      this.serverUrl = await ConfigService.getServerUrl();
    } catch (err: any) { }
    await this.loadToken();
    this.isLoading = false;
  }

  async loadToken() {
    try {
      const token = await AuthService.getAccessToken();
      this.clearErrors();

      if (token) {
        const exp = getJwtExpiration(token);
        const isNowExpired = exp ? (exp * 1000) <= Date.now() : true;

        if (isNowExpired) {
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
      this.handleAuthError(err.toString());
      this.startPolling();
    }
  }

  private handleAuthError(error: string) {
    this.accessToken = null;
    
    if (error.includes('CONNECTION_REFUSED')) {
      this.isAppRunning = false;
      this.hasSession = true; 
      this.technicalError = null;
    } else if (error.includes('NO_SESSION')) {
      this.isAppRunning = true;
      this.hasSession = false;
      this.technicalError = null;
    } else {
      this.technicalError = error;
      this.isAppRunning = true; 
    }
  }

  private clearErrors() {
    this.isAppRunning = true;
    this.hasSession = true;
    this.isExpired = false;
    this.technicalError = null;
  }

  private startPolling() {
    if (this.pollTimer) return;
    
    this.pollTimer = setInterval(async () => {
      try {
        if (!this.serverUrl) {
          try {
            this.serverUrl = await ConfigService.getServerUrl();
          } catch (e) { }
        }

        const token = await AuthService.getAccessToken();
        if (token) {
          const exp = getJwtExpiration(token);
          const isNowExpired = exp ? (exp * 1000) <= Date.now() : true;
          
          if (!isNowExpired) {
            this.clearErrors();
            this.setToken(token);
            this.stopPolling();
          } else {
            this.isExpired = true;
          }
        }
      } catch (err: any) {
        this.handleAuthError(err.toString());
      }
    }, 5000);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
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

    this.refreshTimer = setTimeout(() => {
      this.loadToken();
    }, refreshDelay);
  }
}

export const authStore = new AuthStore();
