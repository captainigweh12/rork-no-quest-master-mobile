/// <reference lib="es2015" />
// @ts-ignore: runtime dependency; types may not be present in this analysis environment
import Constants from 'expo-constants';
// @ts-ignore: runtime dependency; types may not be present in this analysis environment
import AsyncStorage from '@react-native-async-storage/async-storage';

function stripTrailingSlash(url: string): string {
  // Avoid depending on newer lib definitions in environments where lib DOM/ES may be missing.
  if (!url) return url;
  return url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url;
}


function isAndroid(): boolean {
  // Require react-native at runtime to avoid TypeScript errors in environments
  // that do not have react-native type declarations available.
  try {
    // Attempt to access a runtime require without using the `require` identifier directly
    // to avoid compilation errors in environments where `require` is not declared.
    const requireFn = (globalThis as any)['require'] as ((id: string) => any) | undefined;
    const rn: any = requireFn ? requireFn('react-native') : (globalThis as any).ReactNative;
    return rn?.Platform?.OS === 'android';
  } catch {
    // If react-native isn't available, assume non-Android (e.g. web or node).
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
 * Load any persisted override from AsyncStorage into global state and return it.
 */
export async function loadBaseUrlOverride(): Promise<string | undefined> {
  try {
    // Guard access to AsyncStorage — in some runtimes the module may be missing or not initialized.
    const hasStorage = AsyncStorage && typeof (AsyncStorage as any).getItem === 'function';
    if (hasStorage) {
      const val = await (AsyncStorage as any).getItem(OVERRIDE_KEY);
      if (val && val.trim().length > 0) {
        (globalThis as any).__RORK_BASE_URL_OVERRIDE = stripTrailingSlash(val.trim());
        return (globalThis as any).__RORK_BASE_URL_OVERRIDE;
      }
    } else {
      // Fall back to any in-memory global override if AsyncStorage isn't available.
      const g = (globalThis as any).__RORK_BASE_URL_OVERRIDE as string | undefined;
      if (g && g.trim().length > 0) return stripTrailingSlash(g);
    }
  } catch (e) {
    // ignore and fallthrough
  }
  (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
  return undefined;
}

/**
 * Persist (or clear) a base URL override. Pass `undefined` to remove the override.
 */
export async function setBaseUrlOverride(url?: string | undefined): Promise<void> {
  try {
    const hasStorage = AsyncStorage && typeof (AsyncStorage as any).setItem === 'function';
    if (!url) {
      if (hasStorage) {
        await (AsyncStorage as any).removeItem(OVERRIDE_KEY);
      }
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
      return;
    }
    const stripped = stripTrailingSlash(url.trim());
    if (hasStorage) {
      await (AsyncStorage as any).setItem(OVERRIDE_KEY, stripped);
    }
    (globalThis as any).__RORK_BASE_URL_OVERRIDE = stripped;
  } catch (e) {
    // ignore storage errors
  }
}

export function getBaseUrl(): string {
  const override = (globalThis as any).__RORK_BASE_URL_OVERRIDE as string | undefined;
  const defaultUrl = getDefaultBaseUrl();
  
  // Log once per session for debugging
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
    const hasStorage = AsyncStorage && typeof (AsyncStorage as any).removeItem === 'function';
    if (hasStorage) {
      await (AsyncStorage as any).removeItem(OVERRIDE_KEY);
    }
    (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
    console.log(`🌐 Using default Base URL: ${getDefaultBaseUrl()}`);
  } catch (e) {
    // ignore storage errors
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
    // Add other old/deprecated URLs here if needed
  ];
  
  // Check if URL contains any stale patterns
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
