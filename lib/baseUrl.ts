import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL_OVERRIDE_KEY = 'EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE';

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getRenderDefault(): string {
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) return stripTrailingSlash(envUrl.trim());
  return 'https://rork-no-quest-master-mobile.onrender.com';
}

function getEmulatorFallback(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:8081';
  return 'http://127.0.0.1:8081';
}

function computeDefaultBaseUrl(): string {
  // Prefer explicit Render/base URL
  const render = getRenderDefault();
  if (render) return render;
  // Fallbacks for local dev (kept for completeness)
  return getEmulatorFallback();
}

// Globals for cached override + one-time log guard
declare global {
  // eslint-disable-next-line no-var
  var __RORK_BASE_URL_OVERRIDE: string | undefined;
  // eslint-disable-next-line no-var
  var __RORK_BASE_URL_LOGGED: boolean | undefined;
}

export async function loadBaseUrlOverride(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(BASE_URL_OVERRIDE_KEY);
    if (value && value.trim().length > 0) {
      globalThis.__RORK_BASE_URL_OVERRIDE = stripTrailingSlash(value.trim());
      if (!globalThis.__RORK_BASE_URL_LOGGED) {
        console.log(`📡 Using AsyncStorage override Base URL: ${globalThis.__RORK_BASE_URL_OVERRIDE}`);
        globalThis.__RORK_BASE_URL_LOGGED = true;
      }
      return globalThis.__RORK_BASE_URL_OVERRIDE;
    }
    if (!globalThis.__RORK_BASE_URL_LOGGED) {
      console.log(`🌐 Using default Base URL: ${computeDefaultBaseUrl()}`);
      globalThis.__RORK_BASE_URL_LOGGED = true;
    }
    return null;
  } catch (e) {
    console.error('[baseUrl] Override load failed:', e);
    if (!globalThis.__RORK_BASE_URL_LOGGED) {
      console.log(`🌐 Using default Base URL: ${computeDefaultBaseUrl()}`);
      globalThis.__RORK_BASE_URL_LOGGED = true;
    }
    return null;
  }
}

export async function setBaseUrlOverride(url: string): Promise<void> {
  const clean = stripTrailingSlash(url.trim());
  await AsyncStorage.setItem(BASE_URL_OVERRIDE_KEY, clean);
  globalThis.__RORK_BASE_URL_OVERRIDE = clean;
  console.log(`📡 Using AsyncStorage override Base URL: ${clean}`);
}

export async function clearBaseUrlOverride(): Promise<void> {
  await AsyncStorage.removeItem(BASE_URL_OVERRIDE_KEY);
  globalThis.__RORK_BASE_URL_OVERRIDE = undefined;
  console.log(`🌐 Using default Base URL: ${computeDefaultBaseUrl()}`);
}

export function getBaseUrl(): string {
  const override = globalThis.__RORK_BASE_URL_OVERRIDE;
  if (override && override.trim().length > 0) return stripTrailingSlash(override);
  return stripTrailingSlash(computeDefaultBaseUrl());
}

export { BASE_URL_OVERRIDE_KEY };
