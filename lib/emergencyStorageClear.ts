/**
 * Emergency Storage Clear - Nuclear Option
 * 
 * This module performs aggressive storage clearing without reading any data.
 * Used when AsyncStorage is corrupted and causes SyntaxError during parsing.
 */

let clearingComplete = false;
let clearAttempted = false;

/**
 * NUCLEAR OPTION: Clear ALL storage without reading anything
 * This is the only safe way when AsyncStorage.getItem() itself throws SyntaxError
 */
export async function emergencyClearCorruptedStorage(): Promise<void> {
  // Only try once per app session
  if (clearAttempted) {
    return;
  }
  clearAttempted = true;

  console.log('[EMERGENCY] 🚨 Nuclear storage clear initiated');

  try {
    // Import AsyncStorage
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const storage = AsyncStorage.default;
    
    // IMPORTANT: Do NOT try to read anything - just clear everything
    // Reading corrupted data can throw SyntaxError and crash the app
    
    console.log('[EMERGENCY] Clearing ALL storage without reading...');
    
    try {
      // Method 1: Use clear() - fastest but removes everything
      await storage.clear();
      console.log('[EMERGENCY] ✅ Storage cleared using clear()');
      clearingComplete = true;
      return;
    } catch (clearError: any) {
      console.error('[EMERGENCY] clear() failed:', clearError.message);
      
      // Method 2: Try to get keys and remove them
      try {
        const keys = await storage.getAllKeys();
        console.log(`[EMERGENCY] Found ${keys.length} keys, removing all...`);
        
        if (keys.length > 0) {
          // Remove in batches to avoid overwhelming storage
          const BATCH_SIZE = 50;
          for (let i = 0; i < keys.length; i += BATCH_SIZE) {
            const batch = keys.slice(i, i + BATCH_SIZE);
            try {
              await storage.multiRemove(batch);
              console.log(`[EMERGENCY] Removed batch ${Math.floor(i / BATCH_SIZE) + 1}`);
            } catch (batchError) {
              console.warn('[EMERGENCY] Batch removal failed, trying individual removal');
              // Try individual removal
              for (const key of batch) {
                try {
                  await storage.removeItem(key);
                } catch (individualError) {
                  // Ignore individual failures
                  console.warn(`[EMERGENCY] Could not remove key: ${key}`);
                }
              }
            }
          }
        }
        
        console.log('[EMERGENCY] ✅ Storage cleared using key removal');
        clearingComplete = true;
        return;
      } catch (keysError: any) {
        console.error('[EMERGENCY] getAllKeys() failed:', keysError.message);
      }
    }
    
    // If we got here, both methods failed
    console.error('[EMERGENCY] ❌ All clearing methods failed');
    clearingComplete = false;
    
  } catch (error: any) {
    console.error('[EMERGENCY] ❌ Fatal error during emergency clear:', error.message || error);
    clearingComplete = false;
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
    clearAttempted = false;
    clearingComplete = false;
    console.log('[EMERGENCY] State reset');
  }
}
