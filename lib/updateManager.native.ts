import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

/* eslint-disable @typescript-eslint/no-require-imports */
let Updates: any = null;
try {
  const mod = require('expo-updates');
  Updates = mod?.default ?? mod;
} catch {
  console.warn('[Updates] expo-updates not installed, update functionality disabled');
}
/* eslint-enable @typescript-eslint/no-require-imports */

function getOtaFlags() {
  const envOtaEnabled = process.env.EXPO_PUBLIC_OTA_ENABLED;
  const envAlwaysDisable = process.env.EXPO_PUBLIC_ALWAYS_DISABLE_OTA;

  const fromEnv = {
    otaEnabled: envOtaEnabled ? envOtaEnabled === 'true' : undefined,
    alwaysDisableOta: envAlwaysDisable ? envAlwaysDisable === 'true' : undefined,
  };

  const extra = (Constants?.expoConfig as any)?.extra ?? (Updates?.manifest?.extra ?? {});
  return {
    otaEnabled: fromEnv.otaEnabled ?? Boolean(extra?.otaEnabled),
    alwaysDisableOta: fromEnv.alwaysDisableOta ?? Boolean(extra?.alwaysDisableOta),
  };
}

export async function checkAndApplyUpdates(): Promise<void> {
  if (!Updates || Platform.OS === 'web') {
    console.log('[Updates] Skipping - expo-updates not available on this platform');
    return;
  }

  if (__DEV__) {
    console.log('[Updates] Skipping - running in development mode');
    return;
  }

  const { otaEnabled, alwaysDisableOta } = getOtaFlags();
  if (alwaysDisableOta) {
    console.log('[Updates] Skipping - ALWAYS_DISABLE_OTA flag set');
    return;
  }
  if (!otaEnabled) {
    console.log('[Updates] Skipping - OTA updates disabled');
    return;
  }

  if (typeof Updates.checkForUpdateAsync !== 'function' || typeof Updates.fetchUpdateAsync !== 'function') {
    console.log('[Updates] Skipping - expo-updates API not available');
    return;
  }

  try {
    console.log('[Updates] Checking for available updates...');
    const updateResult = await Updates.checkForUpdateAsync();

    if (updateResult?.isAvailable) {
      console.log('[Updates] Update available, fetching…');
      await Updates.fetchUpdateAsync();
      console.log('[Updates] Update fetched successfully');

      Alert.alert(
        'Update Available',
        'A new version has been downloaded. Restart now to apply it?',
        [
          { text: 'Later', style: 'cancel', onPress: () => console.log('[Updates] User chose later') },
          {
            text: 'Restart Now',
            onPress: async () => {
              try {
                console.log('[Updates] Restarting app to apply update');
                await Updates.reloadAsync();
              } catch (e) {
                console.warn('[Updates] reloadAsync failed:', e);
              }
            },
          },
        ]
      );
    } else {
      console.log('[Updates] App is up to date');
    }
  } catch (error) {
    console.warn('[Updates] Failed to check/fetch updates:', error);
  }
}

export function wasUpdateJustApplied(): boolean {
  try {
    if (__DEV__ || Platform.OS === 'web') return false;
    const { otaEnabled, alwaysDisableOta } = getOtaFlags();
    if (!otaEnabled || alwaysDisableOta) return false;

    return false;
  } catch (error) {
    console.warn('[Updates] Error checking if update was applied:', error);
    return false;
  }
}

type UpdateInfoProduction = { mode: 'production'; otaEnabled: boolean; channel?: string | null; updateId?: string | null };
type UpdateInfoDev = { mode: 'development'; otaEnabled: false };
type UpdateInfoError = { mode: 'unknown'; error: string };

export function getCurrentUpdateInfo(): UpdateInfoProduction | UpdateInfoDev | UpdateInfoError {
  try {
    if (__DEV__) {
      return { mode: 'development', otaEnabled: false };
    }
    const { otaEnabled } = getOtaFlags();
    const updateId = Updates?.updateId ?? null;
    const channel = Updates?.channel ?? null;
    return { mode: 'production', otaEnabled, updateId, channel };
  } catch (error) {
    console.warn('[Updates] Error getting update info:', error);
    return { mode: 'unknown', error: String(error) };
  }
}
