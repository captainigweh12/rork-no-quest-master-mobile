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
 * 
 * This function wraps EVERYTHING in try-catch to prevent crashes
 */
export async function emergencyClearCorruptedStorage(): Promise<void> {
  // Only try once per app session
  if (clearAttempted) {
    return;
  }
  clearAttempted = true;

  console.log('[EMERGENCY] 🚨 Nuclear storage clear initiated');

  // Wrap the entire function in a mega try-catch
  try {
    // Step 1: Nuclear clear SQLite database (skip - not critical for this fix)
    console.log('[EMERGENCY] Step 1: Skipping SQLite clear (not needed for AsyncStorage corruption)');

    // Step 2: Clear AsyncStorage
    console.log('[EMERGENCY] Step 2: Clearing AsyncStorage...');
    
    let storage: any;
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      storage = AsyncStorage.default;
    } catch (importError: any) {
      console.error('[EMERGENCY] ❌ Failed to import AsyncStorage:', importError?.message || String(importError));
      clearingComplete = false;
      return;
    }
    
    // IMPORTANT: Do NOT try to read anything - just clear everything
    // Reading corrupted data can throw SyntaxError and crash the app
    
    // Method 1: Use clear() - fastest but removes everything
    try {
      await storage.clear();
      console.log('[EMERGENCY] ✅ AsyncStorage cleared using clear()');
      clearingComplete = true;
      return;
    } catch (clearError: any) {
      const errMsg = clearError?.message || String(clearError);
      console.error('[EMERGENCY] clear() failed:', errMsg);
      
      // Don't try to read keys if we got a SyntaxError
      if (errMsg.includes('SyntaxError') || errMsg.includes("';' expected")) {
        console.error('[EMERGENCY] ❌ AsyncStorage is severely corrupted - cannot be cleared programmatically');
        console.error('[EMERGENCY] 💡 User must manually clear app data from device settings');
        clearingComplete = false;
        return;
      }
    }
    
    // Method 2: Try to get keys and remove them (only if clear() failed without SyntaxError)
    console.log('[EMERGENCY] Attempting key-by-key removal...');
    try {
      const keys = await storage.getAllKeys();
      console.log(`[EMERGENCY] Found ${keys?.length || 0} keys`);
      
      if (keys && keys.length > 0) {
        // Remove in batches to avoid overwhelming storage
        const BATCH_SIZE = 50;
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const batch = keys.slice(i, i + BATCH_SIZE);
          try {
            await storage.multiRemove(batch);
            console.log(`[EMERGENCY] Removed batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          } catch (batchError: any) {
            console.warn('[EMERGENCY] Batch removal failed, trying individual removal');
            // Try individual removal
            for (const key of batch) {
              try {
                await storage.removeItem(key);
              } catch (individualError) {
                // Silently ignore individual failures
              }
            }
          }
        }
        console.log('[EMERGENCY] ✅ AsyncStorage cleared using key removal');
        clearingComplete = true;
        return;
      } else {
        console.log('[EMERGENCY] No keys found or storage already empty');
        clearingComplete = true;
        return;
      }
    } catch (keysError: any) {
      const errMsg = keysError?.message || String(keysError);
      console.error('[EMERGENCY] getAllKeys() failed:', errMsg);
      
      // If we got a SyntaxError here too, storage is severely corrupted
      if (errMsg.includes('SyntaxError') || errMsg.includes("';' expected")) {
        console.error('[EMERGENCY] ❌ Storage metadata is corrupted - cannot enumerate keys');
        console.error('[EMERGENCY] 💡 User must manually clear app data from device settings');
      }
      
      clearingComplete = false;
    }
    
  } catch (error: any) {
    // Mega catch - this should never be reached, but if it is, log it
    const errMsg = error?.message || String(error);
    console.error('[EMERGENCY] ❌ Fatal error during emergency clear:', errMsg);
    console.error('[EMERGENCY] Stack:', error?.stack || 'No stack trace');
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

/**
 * Synchronous emergency clear - runs BEFORE anything else
 * This is called at module load time to catch corruption early
 */
export function syncEmergencyClear(): void {
  if (clearAttempted) return;
  
  console.log('[SYNC_CLEAR] Running synchronous emergency clear...');
  
  // We can't use async/await here, but we can start the process
  emergencyClearCorruptedStorage().catch(err => {
    console.error('[SYNC_CLEAR] Failed:', err);
  });
}
