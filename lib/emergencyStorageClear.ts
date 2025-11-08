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
    const corruptedKeys = new Set<string>();
    
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
          corruptedKeys.add(key);
          continue;
        }
        
        // Check for empty strings
        if (value.trim().length === 0) {
          console.warn(`[EMERGENCY] ⚠️ Key "${key}" has empty value`);
          corruptedKeys.add(key);
          continue;
        }
        
        // Try to parse as JSON
        // Most storage values should be valid JSON
        try {
          const parsed = JSON.parse(value);
          // Valid JSON - this key is fine
          // But also check if the parsed result is reasonable
          if (parsed === undefined || Number.isNaN(parsed)) {
            console.warn(`[EMERGENCY] ⚠️ Key "${key}" parsed to invalid value (undefined/NaN)`);
            corruptedKeys.add(key);
          }
        } catch (parseError: any) {
          console.warn(`[EMERGENCY] ⚠️ Key "${key}" has invalid JSON:`, parseError.message);
          console.warn(`[EMERGENCY]    Value preview: ${value.substring(0, 100)}`);
          corruptedKeys.add(key);
        }
        
        // Additional check: keys starting with "obj" or "arr" or other weird prefixes
        // These are often corrupted values from failed JSON stringification
        const suspiciousPatterns = [
          'obj', 'arr', '[object', 'undefined', 'null', 'NaN',
          'function', 'symbol', 'bigint', // Invalid primitives
          '${', '`', // Template literal fragments
          'Error:', 'TypeError:', 'SyntaxError:', // Error objects
        ];
        
        const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
          value.startsWith(pattern) || value === pattern
        );
        
        if (hasSuspiciousPattern) {
          console.warn(`[EMERGENCY] ⚠️ Key "${key}" has suspicious value pattern`);
          corruptedKeys.add(key);
        }
        
        // Check for values that are too short to be valid JSON objects/arrays
        if ((value.startsWith('{') || value.startsWith('[')) && value.length < 2) {
          console.warn(`[EMERGENCY] ⚠️ Key "${key}" has incomplete JSON structure`);
          corruptedKeys.add(key);
        }
      } catch (error: any) {
        console.error(`[EMERGENCY] ❌ Error scanning key "${key}":`, error.message);
        // If we can't even read it, mark for removal
        corruptedKeys.add(key);
      }
    }
    
    // Remove all corrupted keys
    const corruptedKeysArray = Array.from(corruptedKeys);
    if (corruptedKeysArray.length > 0) {
      console.log(`[EMERGENCY] 🧹 Removing ${corruptedKeysArray.length} corrupted keys:`);
      for (const key of corruptedKeysArray) {
        console.log(`[EMERGENCY]    - ${key}`);
      }
      
      await AsyncStorage.multiRemove(corruptedKeysArray);
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
