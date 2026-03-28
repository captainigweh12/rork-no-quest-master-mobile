import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
let Updates: any = null;
try {
  // Normalize CJS/ESM shape
  const mod = require('expo-updates');
  Updates = mod?.default ?? mod;
} catch {
  console.warn('[Updates] expo-updates not installed, update functionality disabled');
}
/* eslint-enable @typescript-eslint/no-require-imports */

/** Read flags safely (prefer EXPO_PUBLIC_*; fall back to constants/manifest) */
function getOtaFlags() {
  const envOtaEnabled = process.env.EXPO_PUBLIC_OTA_ENABLED;
  const envAlwaysDisable = process.env.EXPO_PUBLIC_ALWAYS_DISABLE_OTA;

  const fromEnv = {
    otaEnabled: envOtaEnabled ? envOtaEnabled === 'true' : undefined,
    alwaysDisableOta: envAlwaysDisable ? envAlwaysDisable === 'true' : undefined,
  };

  // Constants.expoConfig may be undefined in production; guard it.
  const extra = (Constants?.expoConfig as any)?.extra ?? (Updates?.manifest?.extra ?? {});
  return {
    otaEnabled: fromEnv.otaEnabled ?? Boolean(extra?.otaEnabled),
    alwaysDisableOta: fromEnv.alwaysDisableOta ?? Boolean(extra?.alwaysDisableOta),
  };
}

/**
 * Safely check for and apply OTA updates with proper error handling.
 * Call a few seconds after launch.
 */
export async function checkAndApplyUpdates(): Promise<void> {
  // Skip if no module or on web
  if (!Updates || Platform.OS === 'web') {
    console.log('[Updates] Skipping - expo-updates not available on this platform');
    return;
  }

  // Skip in development
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

  // Ensure the API exists (older SDKs)
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

      // Prompt user (you can also auto-apply)
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
    // Optionally report to telemetry
  }
}

/** Whether an update was just applied (placeholder logic; enhance if you set a flag before reload) */
export function wasUpdateJustApplied(): boolean {
  try {
    if (__DEV__ || Platform.OS === 'web') return false;
    const { otaEnabled, alwaysDisableOta } = getOtaFlags();
    if (!otaEnabled || alwaysDisableOta) return false;

    // You can persist a flag before calling reloadAsync() and read it here.
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
    const channel = Updates?.channel ?? null; // newer SDKs
    return { mode: 'production', otaEnabled, updateId, channel };
  } catch (error) {
    console.warn('[Updates] Error getting update info:', error);
    return { mode: 'unknown', error: String(error) };
  }
}
