import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const STORAGE_KEY = 'EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE';

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function isAndroid(): boolean {
  return Platform.OS === 'android';
}

function normalizeBase(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('exp://')) {
    const host = trimmed.replace('exp://', '').replace(/\/$/, '');
    const isSecure = host.includes('.app') || host.includes('.ngrok-free.app') || host.includes('.ngrok.io') || host.includes('.lhr.life');
    return `${isSecure ? 'https' : 'http'}://${host}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return stripTrailingSlash(trimmed);
  const isSecure = trimmed.includes('.app') || trimmed.includes('.ngrok-free.app') || trimmed.includes('.ngrok.io') || trimmed.includes('.lhr.life');
  return `${isSecure ? 'https' : 'http'}://${stripTrailingSlash(trimmed)}`;
}

let memoryOverride: string | undefined;

export function getDefaultBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (explicit && explicit.trim().length > 0) {
    return stripTrailingSlash(explicit);
  }

  const hostUri = Constants?.expoConfig?.hostUri ?? (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    if (hostUri.includes(':')) {
      return `http://${hostUri}`;
    } else {
      return `https://${hostUri}`;
    }
  }

  if (isAndroid()) {
    return 'http://10.0.2.2:8081';
  }
  return 'http://127.0.0.1:8081';
}

export function getBaseUrl(): string {
  const current = memoryOverride ?? (globalThis as any).__RORK_BASE_URL_OVERRIDE;
  if (typeof current === 'string' && current.trim().length > 0) {
    return normalizeBase(current);
  }
  return getDefaultBaseUrl();
}

export async function loadBaseUrlOverride(): Promise<string | undefined> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (val) {
      memoryOverride = val;
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = val;
      console.log('[baseUrl] Loaded override from storage:', val);
      return val;
    }
  } catch (e) {
    console.error('[baseUrl] Failed to load override:', e);
  }
  return undefined;
}

export async function setBaseUrlOverride(url?: string): Promise<void> {
  try {
    if (url && url.trim().length > 0) {
      const normalized = normalizeBase(url);
      memoryOverride = normalized;
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = normalized;
      await AsyncStorage.setItem(STORAGE_KEY, normalized);
      console.log('[baseUrl] Set override:', normalized);
    } else {
      memoryOverride = undefined;
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('[baseUrl] Cleared override');
    }
  } catch (e) {
    console.error('[baseUrl] Failed to set override:', e);
  }
}
