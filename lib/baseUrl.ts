/// <reference lib="es2015" />
// @ts-ignore: runtime dependency; types may not be present in this analysis environment
import Constants from 'expo-constants';
// @ts-ignore: runtime dependency; types may not be present in this analysis environment
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guardedStorage, isStorageReady } from './storage';

function stripTrailingSlash(url: string): string {
  if (!url) return url;
  return url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url;
}

function isAndroid(): boolean {
  try {
    const requireFn = (globalThis as any)['require'] as ((id: string) => any) | undefined;
    const rn: any = requireFn ? requireFn('react-native') : (globalThis as any).ReactNative;
    return rn?.Platform?.OS === 'android';
  } catch {
    return false;
  }
}

export const DEFAULT_RENDER_BASE_URL = 'https://rork-no-quest-master-mobile.onrender.com' as const;

export function getDefaultBaseUrl(): string {
  const explicit = (globalThis as any)?.process?.env?.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (explicit && explicit.trim().length > 0) {
    return stripTrailingSlash(explicit);
  }
  return stripTrailingSlash(DEFAULT_RENDER_BASE_URL);
}

const OVERRIDE_KEY = 'EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE';

/**
 * Load any persisted override from storage into global state and return it.
 */
export async function loadBaseUrlOverride(): Promise<string | undefined> {
  try {
    if (!isStorageReady()) {
      console.warn('[baseUrl] Storage not ready, returning in-memory override if available');
      const g = (globalThis as any).__RORK_BASE_URL_OVERRIDE as string | undefined;
      if (g && g.trim().length > 0) return stripTrailingSlash(g);
      return undefined;
    }

    const val = await guardedStorage.getItem(OVERRIDE_KEY);
    if (val && val.trim().length > 0) {
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = stripTrailingSlash(val.trim());
      return (globalThis as any).__RORK_BASE_URL_OVERRIDE;
    }
  } catch (e) {
    console.warn('[baseUrl] Error loading override:', e);
    const g = (globalThis as any).__RORK_BASE_URL_OVERRIDE as string | undefined;
    if (g && g.trim().length > 0) return stripTrailingSlash(g);
  }
  (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
  return undefined;
}

/**
 * Persist (or clear) a base URL override. Pass `undefined` to remove the override.
 */
export async function setBaseUrlOverride(url?: string | undefined): Promise<void> {
  try {
    if (!url) {
      await guardedStorage.removeItem(OVERRIDE_KEY);
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
      return;
    }
    const stripped = stripTrailingSlash(url.trim());
    await guardedStorage.setItem(OVERRIDE_KEY, stripped);
    (globalThis as any).__RORK_BASE_URL_OVERRIDE = stripped;
  } catch (e) {
    console.warn('[baseUrl] Error setting override:', e);
  }
}

export function getBaseUrl(): string {
  const override = (globalThis as any).__RORK_BASE_URL_OVERRIDE as string | undefined;
  const defaultUrl = getDefaultBaseUrl();

  if (!(globalThis as any).__RORK_BASE_URL_LOGGED) {
    (globalThis as any).__RORK_BASE_URL_LOGGED = true;

    if (override && override.trim().length > 0) {
      console.log('📡 Using AsyncStorage override Base URL:', override);
      console.log('   (Default would be:', defaultUrl + ')');
    } else {
      console.log('🌐 Using default Base URL:', defaultUrl);
      console.log('   (No AsyncStorage override set)');
    }
  }

  if (override && override.trim().length > 0) return override;
  return defaultUrl;
}

// Globals for cached override + one-time log guard
declare global {
  // eslint-disable-next-line no-var
  var __RORK_BASE_URL_OVERRIDE: string | undefined;
  // eslint-disable-next-line no-var
  var __RORK_BASE_URL_LOGGED: boolean | undefined;
}

export async function clearBaseUrlOverride(): Promise<void> {
  try {
    await guardedStorage.removeItem(OVERRIDE_KEY);
    (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
    console.log(`🌐 Using default Base URL: ${getDefaultBaseUrl()}`);
  } catch (e) {
    console.warn('[baseUrl] Error clearing override:', e);
  }
}

/**
 * Check if a URL is a stale/old URL that should be cleared.
 * This includes old rorkset.dev URLs and other deprecated endpoints.
 */
export function isStaleUrl(url: string | undefined): boolean {
  if (!url || url.trim().length === 0) return false;

  const stalePatterns = [
    'rorkset.dev',
    'rorktest.dev',
  ];

  const isStale = stalePatterns.some(pattern => url.includes(pattern));

  if (isStale) {
    console.log(`⚠️ [baseUrl] Detected stale URL pattern in: ${url}`);
  }

  return isStale;
}

/**
 * Automatically detect and clear stale URLs from storage.
 * Returns true if a stale URL was cleared, false otherwise.
 */
export async function clearStaleUrlIfNeeded(): Promise<boolean> {
  try {
    const hasStorage = AsyncStorage && typeof (AsyncStorage as any).getItem === 'function';
    if (!hasStorage) {
      console.warn('[baseUrl] AsyncStorage not available, skipping stale URL check');
      return false;
    }

    const currentOverride = await loadBaseUrlOverride();

    if (isStaleUrl(currentOverride)) {
      console.log(`🧹 [baseUrl] Clearing stale URL: ${currentOverride}`);
      await clearBaseUrlOverride();
      console.log(`✅ [baseUrl] Stale URL cleared successfully`);
      return true;
    }

    return false;
  } catch (e) {
    console.error('[baseUrl] Error checking/clearing stale URL:', e);
    return false;
  }
}

export { OVERRIDE_KEY as BASE_URL_OVERRIDE_KEY };
