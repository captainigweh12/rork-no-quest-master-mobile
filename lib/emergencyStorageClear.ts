/**
 * Emergency Storage Clear - Safe AsyncStorage check
 * 
 * This module safely checks for corrupted AsyncStorage data.
 */

let clearingComplete = false;

/**
 * Safely check and clear corrupted AsyncStorage data
 * Silently handles all errors to prevent app crashes
 */
export async function emergencyClearCorruptedStorage(): Promise<void> {
  if (clearingComplete) {
    return;
  }

  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const storage = AsyncStorage.default;
    
    console.log('[EMERGENCY] Starting storage corruption check...');
    
    // Try to get all keys - if this fails, storage is corrupted
    let allKeys: readonly string[] = [];
    try {
      allKeys = await storage.getAllKeys();
      console.log(`[EMERGENCY] Found ${allKeys.length} storage keys`);
    } catch (keysError: any) {
      console.warn('[EMERGENCY] Failed to get storage keys, clearing all storage');
      console.warn('[EMERGENCY] Error:', keysError.message || keysError);
      try {
        await storage.clear();
        console.log('[EMERGENCY] Storage cleared successfully');
      } catch (clearError: any) {
        // Even clear failed, storage is severely corrupted
        console.error('[EMERGENCY] Failed to clear storage:', clearError.message || clearError);
      }
      clearingComplete = true;
      return;
    }
    
    // Check for corrupted data by trying to get raw values (without parsing)
    if (allKeys && allKeys.length > 0) {
      const keysToRemove: string[] = [];
      
      for (const key of allKeys) {
        try {
          // Try to get raw value without any parsing
          const value = await storage.getItem(key);
          
          if (value === null || value === undefined) {
            // Null/undefined values are OK, skip
            continue;
          }
          
          // Check if value is readable
          try {
            const trimmed = value.trim();
            
            // Check if it looks like it should be JSON
            if (trimmed.length > 0 && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
              // Try to parse - if it fails, it's corrupted
              try {
                JSON.parse(value);
              } catch (parseError) {
                console.warn(`[EMERGENCY] Corrupted JSON in key: ${key}`);
                keysToRemove.push(key);
              }
            }
            // If value has non-printable characters or looks malformed, remove it
            else if (trimmed.length > 0 && !/^[\x20-\x7E\s]*$/.test(trimmed)) {
              console.warn(`[EMERGENCY] Malformed data in key: ${key}`);
              keysToRemove.push(key);
            }
          } catch (stringError) {
            // Even basic string operations failed - definitely corrupted
            console.warn(`[EMERGENCY] Value not even a valid string for key: ${key}`);
            keysToRemove.push(key);
          }
        } catch (getError: any) {
          // Failed to even get the value - corrupted
          console.warn(`[EMERGENCY] Failed to read key: ${key}`);
          console.warn(`[EMERGENCY] Error:`, getError.message || getError);
          keysToRemove.push(key);
        }
      }
      
      // Remove corrupted keys
      if (keysToRemove.length > 0) {
        console.log(`[EMERGENCY] Removing ${keysToRemove.length} corrupted keys:`, keysToRemove);
        try {
          await storage.multiRemove(keysToRemove);
          console.log('[EMERGENCY] Corrupted keys removed successfully');
        } catch (removeError: any) {
          console.error('[EMERGENCY] Failed to remove corrupted keys:', removeError.message || removeError);
          // Try individual removal as fallback
          for (const key of keysToRemove) {
            try {
              await storage.removeItem(key);
              console.log(`[EMERGENCY] Removed ${key} individually`);
            } catch (individualError: any) {
              console.error(`[EMERGENCY] Failed to remove ${key}:`, individualError.message || individualError);
            }
          }
        }
      } else {
        console.log('[EMERGENCY] No corrupted keys found');
      }
    }
    
    clearingComplete = true;
    console.log('[EMERGENCY] Corruption check complete');
  } catch (error: any) {
    // Silently handle all errors - don't block app startup
    console.error('[EMERGENCY] Emergency clear failed:', error.message || error);
    // Last resort: try to clear all storage using a different approach
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.clear();
      console.log('[EMERGENCY] Forced storage clear successful');
    } catch (lastResortError: any) {
      console.error('[EMERGENCY] Even forced clear failed:', lastResortError.message || lastResortError);
    }
    clearingComplete = true;
  }
}

/**
 * Check if emergency clearing has completed
 */
export function isEmergencyClearComplete(): boolean {
  return clearingComplete;
}

/**
 * Reset the emergency clear state (for testing only)
 */
export function resetEmergencyClearState(): void {
  if (__DEV__) {
    clearingComplete = false;
    console.log('[EMERGENCY] State reset');
  }
}
