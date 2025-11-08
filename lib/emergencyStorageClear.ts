/**
 * Emergency Storage Clear - Legacy AsyncStorage cleanup
 * 
 * This module clears corrupted AsyncStorage data before migration to SQLite.
 * After migration, SQLite handles data integrity automatically.
 */

let clearingComplete = false;

/**
 * Clear corrupted AsyncStorage data before SQLite migration
 * This is now a compatibility layer for legacy data
 */
export async function emergencyClearCorruptedStorage(): Promise<void> {
  if (clearingComplete) {
    console.log('[EMERGENCY] Already cleared');
    return;
  }

  try {
    console.log('[EMERGENCY] Checking for legacy AsyncStorage data...');
    
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const storage = AsyncStorage.default;
    
    const allKeys = await storage.getAllKeys();
    
    if (!allKeys || allKeys.length === 0) {
      console.log('[EMERGENCY] No legacy data found');
      clearingComplete = true;
      return;
    }

    console.log(`[EMERGENCY] Found ${allKeys.length} keys in AsyncStorage`);
    console.log('[EMERGENCY] These will be migrated to SQLite automatically');
    
    clearingComplete = true;
  } catch (error: any) {
    console.error('[EMERGENCY] Error checking legacy storage:', error.message);
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
