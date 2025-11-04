import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL_OVERRIDE_KEY = 'EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE';

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function isAndroid(): boolean {
  return Platform.OS === 'android';
}

/**
 * Determine the best default base URL for API calls.
 */
export function getDefaultBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (explicit && explicit.trim().length > 0) {
    return stripTrailingSlash(explicit);
  }

  // Detect Expo host URI in dev mode
  const hostUri =
    Constants?.expoConfig?.hostUri ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const protocol = hostUri.includes(':') ? 'http' : 'https';
    return `${protocol}://${hostUri}`;
  }

  // Fallback for Android emulator and iOS sim
