// @ts-nocheck
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

/**
 * Safely check for and apply OTA updates with proper error handling.
 * This function will never crash the app - it fails silently and logs warnings.
 * 
 * Usage: Call this after app initialization, preferably 3-5 seconds after launch
 * to ensure the app is stable before checking for updates.
 */
export async function checkAndApplyUpdates() {
  // Skip in development mode
  if (__DEV__) {
    console.log('[Updates] Skipping - running in development mode');
    return;
  }

  // Check if OTA is enabled at build time (from app.config.ts)
  const otaEnabled = Constants.expoConfig?.extra?.otaEnabled;
  
  if (!otaEnabled) {
    console.log('[Updates] Skipping - OTA updates disabled in config');
    return;
  }

  try {
    console.log('[Updates] Checking for available updates...');
    
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
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
    if (!otaEnabled) return false;

    // Check if we just loaded a new update
    const updateInfo = Updates.createdAt;
    if (!updateInfo) return false;

    // Consider an update "just applied" if it was created in the last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return new Date(updateInfo).getTime() > fiveMinutesAgo;
  } catch (error) {
    console.warn('[Updates] Error checking if update was applied:', error);
    return false;
  }
}

/**
 * Get current update information for debugging/display
 */
export function getCurrentUpdateInfo() {
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
      updateId: Updates.updateId,
      createdAt: Updates.createdAt,
      otaEnabled,
      runtimeVersion: Updates.runtimeVersion,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    };
  } catch (error) {
    console.warn('[Updates] Error getting update info:', error);
    return {
      mode: 'unknown',
      error: String(error),
    };
  }
}
