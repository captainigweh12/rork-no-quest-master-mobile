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
    
    // Try to get all keys - if this fails, storage is corrupted
    const allKeys = await storage.getAllKeys();
    
    // Check for corrupted data by trying to parse each value
    if (allKeys && allKeys.length > 0) {
      const keysToRemove: string[] = [];
      
      for (const key of allKeys) {
        try {
          const value = await storage.getItem(key);
          if (value && value.trim().length > 0) {
            // Try to parse - if it fails, it's corrupted
            JSON.parse(value);
          }
        } catch (parseError) {
          // Corrupted key found
          keysToRemove.push(key);
        }
      }
      
      // Remove corrupted keys
      if (keysToRemove.length > 0) {
        console.log(`[EMERGENCY] Removing ${keysToRemove.length} corrupted keys`);
        await storage.multiRemove(keysToRemove);
      }
    }
    
    clearingComplete = true;
  } catch (error: any) {
    // Silently handle all errors - don't block app startup
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
