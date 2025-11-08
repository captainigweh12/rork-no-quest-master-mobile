/**
 * Emergency Storage Clear - Runs FIRST during app initialization
 * 
 * This module immediately clears any corrupted data from AsyncStorage
 * before any other code tries to parse it.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

let clearingInProgress = false;
let clearingComplete = false;

/**
 * Immediately clear all corrupted or invalid JSON from AsyncStorage
 * This runs synchronously (as much as possible) to prevent parsing errors
 */
export async function emergencyClearCorruptedStorage(): Promise<void> {
  if (clearingComplete) {
    console.log('[EMERGENCY] Storage already cleared');
    return;
  }

  if (clearingInProgress) {
    console.log('[EMERGENCY] Clearing already in progress, waiting...');
    // Wait for the existing clear to complete
    while (clearingInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  clearingInProgress = true;

  try {
    console.log('[EMERGENCY] 🚨 Starting emergency storage scan...');
    
    const allKeys = await AsyncStorage.getAllKeys();
    
    if (!allKeys || allKeys.length === 0) {
      console.log('[EMERGENCY] No keys to scan');
      clearingComplete = true;
      clearingInProgress = false;
      return;
    }

    console.log(`[EMERGENCY] Scanning ${allKeys.length} keys...`);
    const corruptedKeys: string[] = [];
    
    // Scan each key for corruption
    for (const key of allKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        
        // Skip null/undefined values
        if (value === null || value === undefined) {
          continue;
        }
        
        // Check if it's a string
        if (typeof value !== 'string') {
          console.warn(`[EMERGENCY] ⚠️ Key "${key}" has non-string value`);
          corruptedKeys.push(key);
          continue;
        }
        
        // Check for empty strings
        if (value.trim().length === 0) {
          console.warn(`[EMERGENCY] ⚠️ Key "${key}" has empty value`);
          corruptedKeys.push(key);
          continue;
        }
        
        // Try to parse as JSON
        // Most storage values should be valid JSON
        try {
          JSON.parse(value);
          // Valid JSON - this key is fine
        } catch (parseError: any) {
          console.warn(`[EMERGENCY] ⚠️ Key "${key}" has invalid JSON:`, parseError.message);
          console.warn(`[EMERGENCY]    Value preview: ${value.substring(0, 50)}...`);
          corruptedKeys.push(key);
        }
      } catch (error: any) {
        console.error(`[EMERGENCY] ❌ Error scanning key "${key}":`, error.message);
        // If we can't even read it, mark for removal
        corruptedKeys.push(key);
      }
    }
    
    // Remove all corrupted keys
    if (corruptedKeys.length > 0) {
      console.log(`[EMERGENCY] 🧹 Removing ${corruptedKeys.length} corrupted keys:`);
      for (const key of corruptedKeys) {
        console.log(`[EMERGENCY]    - ${key}`);
      }
      
      await AsyncStorage.multiRemove(corruptedKeys);
      console.log('[EMERGENCY] ✅ Corrupted data removed successfully');
    } else {
      console.log('[EMERGENCY] ✅ No corrupted data found');
    }
    
    clearingComplete = true;
  } catch (error: any) {
    console.error('[EMERGENCY] ❌ Fatal error during emergency clear:', error.message);
    // Even if we fail, mark as complete to avoid infinite loops
    clearingComplete = true;
  } finally {
    clearingInProgress = false;
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
    clearingInProgress = false;
    console.log('[EMERGENCY] State reset');
  }
}
