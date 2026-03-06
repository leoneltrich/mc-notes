import { invoke } from '@tauri-apps/api/core';

export class ConfigService {
  static async getServerUrl(): Promise<string> {
    try {
      return await invoke<string>('get_server_url');
    } catch (error) {
      throw error;
    }
  }
}
