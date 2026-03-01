import { AuthService } from '$lib/services/auth.service';
import { getJwtExpiration } from '$lib/utils/jwt';

class AuthStore {
  accessToken = $state<string | null>(null);
  isLoading = $state(true);
  isAuthenticated = $derived(!!this.accessToken);
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  async init() {
    this.isLoading = true;
    await this.loadToken();
    this.isLoading = false;
  }

  async loadToken() {
    const token = await AuthService.getAccessToken();
    if (token) {
      this.setToken(token);
    } else {
      this.accessToken = null;
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
