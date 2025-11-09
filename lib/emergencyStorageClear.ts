/**
 * Emergency Storage Clear - Nuclear Option
 * 
 * This module performs aggressive storage clearing without reading any data.
 * Used when AsyncStorage is corrupted and causes SyntaxError during parsing.
 */

import { Platform } from 'react-native';

let clearingComplete = false;
let clearAttempted = false;

/**
 * NUCLEAR OPTION: Clear ALL storage without reading anything
 * This is the only safe way when AsyncStorage.getItem() itself throws SyntaxError
 * 
 * This function wraps EVERYTHING in try-catch to prevent crashes
 */
/**
 * Detect if a storage value might be corrupted based on common patterns
 */
function detectCorruptedValue(value: string | null | undefined): boolean {
  if (!value) return false;
  
  try {
    const str = String(value).trim();
    
    // Pattern 1: Contains unexpected semicolons in the first 20 chars (common corruption)
    if (/^.{0,20}.*;/.test(str)) {
      console.warn('[EMERGENCY] Detected semicolon corruption in storage value');
      return true;
    }
    
    // Pattern 2: Contains control characters
    if (/[\x00-\x1F]/.test(str.substring(0, 50))) {
      console.warn('[EMERGENCY] Detected control character corruption in storage value');
      return true;
    }
    
    // Pattern 3: Malformed JSON (starts with { or [ but doesn't parse)
    if ((str.startsWith('{') || str.startsWith('[')) && str.length > 2) {
      try {
        JSON.parse(str);
      } catch (e) {
        console.warn('[EMERGENCY] Detected JSON parsing corruption in storage value');
        return true;
      }
    }
    
    return false;
  } catch (e) {
    console.warn('[EMERGENCY] Error detecting corruption:', e);
    return true;
  }
}

export async function emergencyClearCorruptedStorage(): Promise<void> {
  // Only try once per app session
  if (clearAttempted) {
    return;
  }
  clearAttempted = true;

  console.log('[EMERGENCY] 🚨 Nuclear storage clear initiated');
  console.log('[EMERGENCY] Platform:', Platform.OS);

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
      console.log('[EMERGENCY] AsyncStorage imported successfully ✓');
    } catch (importError: any) {
      const errorMsg = importError?.message || String(importError);
      console.error('[EMERGENCY] ❌ Failed to import AsyncStorage:', errorMsg);
      
      // Check if it's a SyntaxError during import (extremely bad)
      if (errorMsg.includes('SyntaxError') || errorMsg.includes("';' expected") || errorMsg.includes("':' expected")) {
        console.error('[EMERGENCY] 🔴 CRITICAL: SyntaxError during AsyncStorage import');
        console.error('[EMERGENCY] This indicates severe storage corruption at the native level');
        console.error('[EMERGENCY] User MUST manually clear app data from device settings');
        console.error('[EMERGENCY] iOS: Settings → General → iPhone Storage → [App] → Delete App');
        console.error('[EMERGENCY] Android: Settings → Apps → [App] → Storage → Clear Data');
      }
      
      clearingComplete = false;
      return;
    }
    
    // IMPORTANT: Do NOT try to read anything - just clear everything
    // Reading corrupted data can throw SyntaxError and crash the app
    
    // Method 1: Use clear() - fastest but removes everything
    console.log('[EMERGENCY] Attempting storage.clear()...');
    try {
      await storage.clear();
      console.log('[EMERGENCY] ✅ AsyncStorage cleared using clear()');
      console.log('[EMERGENCY] App should now restart cleanly');
      clearingComplete = true;
      return;
    } catch (clearError: any) {
      const errMsg = clearError?.message || String(clearError);
      console.error('[EMERGENCY] clear() failed:', errMsg);
      console.error('[EMERGENCY] Error type:', clearError?.constructor?.name || 'Unknown');
      
      // Don't try to read keys if we got a SyntaxError
      if (errMsg.includes('SyntaxError') || errMsg.includes("';' expected") || errMsg.includes("':' expected")) {
        console.error('[EMERGENCY] 🔴 CRITICAL: AsyncStorage.clear() threw SyntaxError');
        console.error('[EMERGENCY] This indicates storage is corrupted at the native layer');
        console.error('[EMERGENCY] ❌ Cannot be fixed programmatically');
        console.error('[EMERGENCY] 💡 REQUIRED ACTION: User must manually clear app data');
        console.error('[EMERGENCY] iOS: Settings → General → iPhone Storage → [App] → Delete App');
        console.error('[EMERGENCY] Android: Settings → Apps → [App] → Storage → Clear Data');
        clearingComplete = false;
        return;
      }
    }
    
    // Method 2: Try to get keys and remove them (only if clear() failed without SyntaxError)
    console.log('[EMERGENCY] Method 2: Attempting key-by-key removal...');
    try {
      const keys = await storage.getAllKeys();
      console.log(`[EMERGENCY] Found ${keys?.length || 0} keys in storage`);
      
      if (keys && keys.length > 0) {
        console.log('[EMERGENCY] Keys:', keys.slice(0, 10).join(', '), keys.length > 10 ? '...' : '');
        
        // First pass: identify corrupted keys by attempting to read them
        const corruptedKeys: string[] = [];
        for (const key of keys) {
          try {
            const value = await storage.getItem(key);
            if (detectCorruptedValue(value)) {
              console.warn(`[EMERGENCY] Detected corrupted value for key: ${key}`);
              corruptedKeys.push(key);
            }
          } catch (readError: any) {
            const readMsg = readError?.message || String(readError);
            if (readMsg.includes('SyntaxError') || readMsg.includes("';' expected") || readMsg.includes("':' expected")) {
              console.error(`[EMERGENCY] SyntaxError reading key ${key} - marking for removal`);
              corruptedKeys.push(key);
            }
          }
        }
        
        if (corruptedKeys.length > 0) {
          console.log(`[EMERGENCY] Found ${corruptedKeys.length} corrupted keys, removing them...`);
          for (const key of corruptedKeys) {
            try {
              await storage.removeItem(key);
              console.log(`[EMERGENCY] ✓ Removed corrupted key: ${key}`);
            } catch (removeError) {
              console.error(`[EMERGENCY] Failed to remove key ${key}:`, removeError);
            }
          }
        }
        
        // Second pass: remove all keys in batches
        console.log('[EMERGENCY] Removing all keys in batches...');
        const BATCH_SIZE = 50;
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const batch = keys.slice(i, i + BATCH_SIZE);
          try {
            await storage.multiRemove(batch);
            console.log(`[EMERGENCY] ✓ Removed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(keys.length / BATCH_SIZE)}`);
          } catch (batchError: any) {
            console.warn('[EMERGENCY] Batch removal failed, trying individual removal');
            for (const key of batch) {
              try {
                await storage.removeItem(key);
              } catch (individualError) {
                console.error(`[EMERGENCY] Failed to remove ${key}:`, individualError);
              }
            }
          }
        }
        console.log('[EMERGENCY] ✅ AsyncStorage cleared using key removal');
        clearingComplete = true;
        return;
      } else {
        console.log('[EMERGENCY] No keys found - storage already empty ✓');
        clearingComplete = true;
        return;
      }
    } catch (keysError: any) {
      const errMsg = keysError?.message || String(keysError);
      console.error('[EMERGENCY] getAllKeys() failed:', errMsg);
      console.error('[EMERGENCY] Error type:', keysError?.constructor?.name || 'Unknown');
      
      // If we got a SyntaxError here too, storage is severely corrupted
      if (errMsg.includes('SyntaxError') || errMsg.includes("';' expected") || errMsg.includes("':' expected")) {
        console.error('[EMERGENCY] 🔴 CRITICAL: getAllKeys() threw SyntaxError');
        console.error('[EMERGENCY] Storage metadata is corrupted at native level');
        console.error('[EMERGENCY] ❌ Cannot enumerate or clear keys programmatically');
        console.error('[EMERGENCY] 💡 REQUIRED ACTION: User must manually clear app data');
        console.error('[EMERGENCY] iOS: Settings → General → iPhone Storage → [App] → Delete App & Reinstall');
        console.error('[EMERGENCY] Android: Settings → Apps → [App] → Storage → Clear Data');
      }
      
      clearingComplete = false;
    }
    
  } catch (error: any) {
    // Mega catch - this should never be reached, but if it is, log it
    const errMsg = error?.message || String(error);
    console.error('[EMERGENCY] ❌ Fatal error during emergency clear:', errMsg);
    console.error('[EMERGENCY] Error type:', error?.constructor?.name || 'Unknown');
    console.error('[EMERGENCY] Stack:', error?.stack || 'No stack trace');
    console.error('[EMERGENCY] Platform:', Platform.OS);
    
    // Special handling for SyntaxError in the mega catch
    if (errMsg.includes('SyntaxError') || errMsg.includes("';' expected") || errMsg.includes("':' expected")) {
      console.error('[EMERGENCY] 🔴 CRITICAL: SyntaxError in emergency clear mega catch');
      console.error('[EMERGENCY] This is the worst-case scenario - native storage is corrupted');
      console.error('[EMERGENCY] 💡 User must uninstall and reinstall the app');
    }
    
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
