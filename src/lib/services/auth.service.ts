import { invoke } from '@tauri-apps/api/core';

export class AuthService {
  static async getAccessToken(): Promise<string | null> {
    try {
      console.log('Invoking get_access_token...');
      const token = await invoke<string | null>('get_access_token');
      console.log('Token received:', token ? 'Yes' : 'No');
      return token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }
}
