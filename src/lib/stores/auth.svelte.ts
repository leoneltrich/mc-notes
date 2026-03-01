import { AuthService } from '$lib/services/auth.service';

class AuthStore {
  accessToken = $state<string | null>(null);
  isLoading = $state(true);
  isAuthenticated = $derived(!!this.accessToken);

  async init() {
    this.isLoading = true;
    this.accessToken = await AuthService.getAccessToken();
    this.isLoading = false;
  }
}

export const authStore = new AuthStore();
