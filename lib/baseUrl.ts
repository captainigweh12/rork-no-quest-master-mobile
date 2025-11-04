import { Platform } from 'react-native';
import Constants from 'expo-constants';

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function isAndroid(): boolean {
  return Platform.OS === 'android';
}

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
  return getDefaultBaseUrl();
}
