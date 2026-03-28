import { Platform } from 'react-native';
import { guardedStorage } from './storage';

type Json = unknown;

const isWeb = Platform.OS === 'web';

export const local = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return guardedStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    await guardedStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    await guardedStorage.removeItem(key);
  },

  async getJSON<T = Json>(key: string, fallback: T | null = null): Promise<T | null> {
    const raw = await this.getItem(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  async setJSON(key: string, value: Json): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  },
};

export default local;
