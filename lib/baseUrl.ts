import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const STORAGE_KEY = 'EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE';

function normalizeBase(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('exp://')) {
    const host = trimmed.replace('exp://', '').replace(/\/$/, '');
    const isSecure = host.includes('.app') || host.includes('.ngrok-free.app') || host.includes('.ngrok.io');
    return `${isSecure ? 'https' : 'http'}://${host}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed.replace(/\/$/, '');
  const isSecure = trimmed.includes('.app') || trimmed.includes('.ngrok-free.app') || trimmed.includes('.ngrok.io');
  return `${isSecure ? 'https' : 'http'}://${trimmed.replace(/\/$/, '')}`;
}

let memoryOverride: string | undefined;

export function getDefaultBaseUrl(): string {
  const envBase = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envBase && envBase.trim().length > 0) return normalizeBase(envBase);

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && (window as any).location?.origin) {
      return (window as any).location.origin as string;
    }
  }

  const hostUri = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    const isSecure = host.includes('.app') || host.includes('.ngrok-free.app') || host.includes('.ngrok.io');
    return `${isSecure ? 'https' : 'http'}://${host}`;
  }

  console.warn('[baseUrl] Missing EXPO_PUBLIC_RORK_API_BASE_URL and cannot infer host. Defaulting to http://localhost:8081');
  return 'http://localhost:8081';
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
