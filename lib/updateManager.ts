import Constants from 'expo-constants';
import { Alert } from 'react-native';

/* eslint-disable @typescript-eslint/no-require-imports */
let Updates: any = null;
try {
  Updates = require('expo-updates');
} catch {
  console.warn('[Updates] expo-updates not installed, update functionality disabled');
}
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Safely check for and apply OTA updates with proper error handling.
 * This function will never crash the app - it fails silently and logs warnings.
 * 
 * Usage: Call this after app initialization, preferably 3-5 seconds after launch
 * to ensure the app is stable before checking for updates.
 */
export async function checkAndApplyUpdates(): Promise<void> {
  // Skip if expo-updates not installed
  if (!Updates) {
    console.log('[Updates] Skipping - expo-updates not installed');
    return;
  }
  
  // Skip in development mode
  if (__DEV__) {
    console.log('[Updates] Skipping - running in development mode');
    return;
  }

  // Check if OTA is enabled at build time (from app.config.ts)
  const otaEnabled = Constants.expoConfig?.extra?.otaEnabled;
  const hardOff = Constants.expoConfig?.extra?.alwaysDisableOta;
  if (hardOff) {
    console.log('[Updates] Skipping - ALWAYS_DISABLE_OTA flag set');
    return;
  }
  
  if (!otaEnabled) {
    console.log('[Updates] Skipping - OTA updates disabled in config');
    return;
  }

  try {
    console.log('[Updates] Checking for available updates...');
    
  const updateResult = await Updates.checkForUpdateAsync();
  if (updateResult.isAvailable) {
      console.log('[Updates] Update available, fetching...');
      
      await Updates.fetchUpdateAsync();
      
      console.log('[Updates] Update fetched successfully');
      
      // Optionally show user a prompt to restart
      // You can customize this or make it silent
      Alert.alert(
        'Update Available',
        'A new version has been downloaded. Would you like to restart the app to apply it?',
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => console.log('[Updates] User chose to apply update later'),
          },
          {
            text: 'Restart Now',
            onPress: () => {
              console.log('[Updates] Restarting app to apply update');
              Updates.reloadAsync();
            },
          },
        ]
      );
    } else {
      console.log('[Updates] App is up to date');
    }
  } catch (error) {
    // Silently fail - NEVER crash the app due to update errors
    console.warn('[Updates] Failed to check/fetch updates:', error);
    
    // Optional: Send error to your analytics/monitoring service
    // trackError('OTA_UPDATE_FAILED', error);
    
    // App continues with cached bundle - no user impact
  }
}

/**
 * Check if an update was applied on the last reload.
 * Useful for showing "What's New" or success messages.
 */
export function wasUpdateJustApplied(): boolean {
  try {
    // Skip in dev or if OTA disabled
    if (__DEV__) return false;
    
  const otaEnabled = Constants.expoConfig?.extra?.otaEnabled;
  const hardOff = Constants.expoConfig?.extra?.alwaysDisableOta;
  if (!otaEnabled || hardOff) return false;

    // Check if we just loaded a new update
  // Expo Updates API doesn't expose createdAt; we approximate via recently downloaded manifest metadata.
  // For now return false (can be enhanced with persistent flag on reloadAsync path).
  return false;
  } catch (error) {
    console.warn('[Updates] Error checking if update was applied:', error);
    return false;
  }
}

/**
 * Get current update information for debugging/display
 */
interface UpdateInfoProduction {
  mode: 'production';
  otaEnabled: boolean;
}

interface UpdateInfoDev {
  mode: 'development';
  updateId: null;
  createdAt: null;
  otaEnabled: boolean;
}

interface UpdateInfoError {
  mode: 'unknown';
  error: string;
}

export function getCurrentUpdateInfo(): UpdateInfoProduction | UpdateInfoDev | UpdateInfoError {
  try {
    if (__DEV__) {
      return {
        mode: 'development',
        updateId: null,
        createdAt: null,
        otaEnabled: false,
      };
    }

    const otaEnabled = Constants.expoConfig?.extra?.otaEnabled ?? false;

    return {
      mode: 'production',
      otaEnabled,
    };
  } catch (error) {
    console.warn('[Updates] Error getting update info:', error);
    return {
      mode: 'unknown',
      error: String(error),
    };
  }
}
