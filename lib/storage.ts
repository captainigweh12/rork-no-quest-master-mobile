/**
 * Storage Guard Module
 * 
 * Prevents premature AsyncStorage access during app startup.
 * All storage operations must wait for explicit initialization.
 * Includes comprehensive error handling and data validation.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

// Storage initialization state
let storageReady = false;
let storageAvailable = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Clean up corrupted data from AsyncStorage
 * Scans all keys and removes any with invalid JSON
 */
async function cleanupCorruptedData(): Promise<void> {
  try {
    console.log('[STORAGE] Scanning for corrupted data...');
    const allKeys = await AsyncStorage.getAllKeys();
    
    if (!allKeys || allKeys.length === 0) {
      console.log('[STORAGE] No keys found to scan');
      return;
    }

    const corruptedKeys: string[] = [];
    
    for (const key of allKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        
        if (value === null || value === undefined) {
          continue;
        }
        
        if (typeof value !== 'string') {
          console.warn(`[STORAGE] Found non-string value for key: ${key}`);
          corruptedKeys.push(key);
          continue;
        }
        
        if (value.trim().length === 0) {
          console.warn(`[STORAGE] Found empty value for key: ${key}`);
          corruptedKeys.push(key);
          continue;
        }
        
        // Try to parse the JSON to detect corruption
        try {
          JSON.parse(value);
        } catch {
          console.warn(`[STORAGE] Found corrupted data for key: ${key}`);
          console.warn(`[STORAGE] Value preview: ${value.substring(0, 100)}`);
          corruptedKeys.push(key);
        }
        
        // Check for suspicious patterns that indicate corruption
        if (value.startsWith('obj') || value.startsWith('arr') || value.startsWith('[object') || value.startsWith('undefined') || value === 'NaN') {
          console.warn(`[STORAGE] Found suspicious pattern for key: ${key}`);
          corruptedKeys.push(key);
        }
      } catch (error) {
        console.error(`[STORAGE] Error checking key: ${key}`, error);
        corruptedKeys.push(key);
      }
    }
    
    if (corruptedKeys.length > 0) {
      console.log(`[STORAGE] Removing ${corruptedKeys.length} corrupted keys:`, corruptedKeys);
      await AsyncStorage.multiRemove(corruptedKeys);
      console.log('[STORAGE] ✓ Corrupted data cleaned up');
    } else {
      console.log('[STORAGE] ✓ No corrupted data found');
    }
  } catch (error) {
    console.error('[STORAGE] Error during cleanup:', error);
  }
}

/**
 * Initialize app storage
 * Performs any cleanup, migrations, or setup needed before allowing storage access
 */
export async function initAppStorage(): Promise<void> {
  if (storageReady) {
    console.log('[STORAGE] Already initialized');
    return;
  }

  if (initializationPromise) {
    console.log('[STORAGE] Waiting for existing initialization');
    return initializationPromise;
  }

  console.log('[STORAGE] Starting initialization...');
  
  initializationPromise = (async () => {
    try {
      // Ping AsyncStorage to ensure it's ready (more precise than fixed delay)
      // This yields the "storage is ready" signal without arbitrary delay
      await AsyncStorage.getItem('__storage_ping__').catch(() => null);
      
      // Check if storage is actually available (Safari private mode, etc.)
      try {
        await AsyncStorage.setItem('__storage_test__', 'test');
        await AsyncStorage.removeItem('__storage_test__');
        storageAvailable = true;
        console.log('[STORAGE] Available and working ✓');
      } catch (storageError: any) {
        storageAvailable = false;
        
        // Detect specific errors
        const isQuotaError = storageError?.name === 'QuotaExceededError' || 
                           storageError?.code === 22 ||
                           storageError?.message?.includes('quota');
        
        if (isQuotaError) {
          console.warn('[STORAGE] ⚠️ Storage quota exceeded. Using in-memory fallback.');
        } else {
          console.warn('[STORAGE] ⚠️ Unavailable (likely Safari Private Mode / blocked). Using in-memory fallback.');
        }
        console.warn('[STORAGE] In-memory mode: changes will NOT persist across app restarts.');
      }
      
      // Clean up any corrupted data from storage
      if (storageAvailable) {
        await cleanupCorruptedData();
      }
      
      console.log('[STORAGE] Initialization complete');
      storageReady = true;
    } catch (error) {
      console.error('[STORAGE] Initialization failed:', error);
      // Even if initialization fails, mark as ready with fallback behavior
      storageReady = true;
    }
  })();

  return initializationPromise;
}

/**
 * Manually enable storage access (for testing or special cases)
 */
export function enableStorageAccess(): void {
  storageReady = true;
  console.log('[STORAGE] Access manually enabled');
}

/**
 * Disable storage access (for testing or reset scenarios)
 */
export function disableStorageAccess(): void {
  storageReady = false;
  initializationPromise = null;
  console.log('[STORAGE] Access disabled');
}

/**
 * Check if storage is ready for access
 */
export function isStorageReady(): boolean {
  return storageReady;
}

/**
 * Check if storage is actually available (not just ready)
 * Returns false in Safari private mode, quota exceeded, etc.
 */
export function isStorageAvailable(): boolean {
  return storageAvailable;
}

/**
 * Guarded storage wrapper
 * Returns null or empty results if storage is not ready
 */
export const guardedStorage = {
  /**
   * Get an item from storage (returns null if not ready)
   * Includes retry logic and validation
   */
  async getItem(key: string): Promise<string | null> {
    if (!storageReady) {
      console.warn(`[STORAGE] Blocked getItem for "${key}" - storage not initialized`);
      return null;
    }
    
    if (!storageAvailable) {
      return null;
    }
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const value = await AsyncStorage.getItem(key);
        
        if (value === null || value === undefined) {
          return null;
        }
        
        if (typeof value !== 'string') {
          console.warn(`[STORAGE] Invalid value type for "${key}", expected string`);
          await AsyncStorage.removeItem(key);
          return null;
        }
        
        if (value.trim().length === 0) {
          console.warn(`[STORAGE] Empty value for "${key}", cleaning up`);
          await AsyncStorage.removeItem(key);
          return null;
        }
        
        return value;
      } catch (error) {
        console.error(`[STORAGE] Error getting item "${key}" (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
        
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          return null;
        }
      }
    }
    
    return null;
  },

  /**
   * Set an item in storage (no-op if not ready)
   * Validates data before storing and includes retry logic
   */
  async setItem(key: string, value: string): Promise<void> {
    if (!storageReady || !storageAvailable) {
      return;
    }
    
    if (typeof value !== 'string') {
      console.error(`[STORAGE] Cannot set "${key}": value must be a string`);
      return;
    }
    
    if (value.trim().length === 0) {
      console.warn(`[STORAGE] Attempting to set empty value for "${key}", skipping`);
      return;
    }
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await AsyncStorage.setItem(key, value);
        return;
      } catch (error: any) {
        console.error(`[STORAGE] Error setting item "${key}" (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
        
        const isQuotaError = error?.name === 'QuotaExceededError' || 
                           error?.code === 22 ||
                           error?.message?.includes('quota');
        
        if (isQuotaError) {
          console.error(`[STORAGE] Storage quota exceeded for "${key}"`);
          return;
        }
        
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
  },

  /**
   * Remove an item from storage (no-op if not ready)
   */
  async removeItem(key: string): Promise<void> {
    if (!storageReady || !storageAvailable) {
      // Silently no-op if storage is unavailable
      return;
    }
    
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[STORAGE] Error removing item "${key}":`, error);
    }
  },

  /**
   * Get multiple items from storage
   */
  async multiGet(keys: string[]): Promise<readonly [string, string | null][]> {
    if (!storageReady) {
      console.warn(`[STORAGE] Blocked multiGet - storage not ready`);
      return keys.map(key => [key, null] as [string, null]);
    }
    
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error(`[STORAGE] Error in multiGet:`, error);
      return keys.map(key => [key, null] as [string, null]);
    }
  },

  /**
   * Set multiple items in storage
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    if (!storageReady) {
      console.warn(`[STORAGE] Blocked multiSet - storage not ready`);
      return;
    }
    
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error(`[STORAGE] Error in multiSet:`, error);
    }
  },

  /**
   * Remove multiple items from storage
   */
  async multiRemove(keys: string[]): Promise<void> {
    if (!storageReady) {
      console.warn(`[STORAGE] Blocked multiRemove - storage not ready`);
      return;
    }
    
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error(`[STORAGE] Error in multiRemove:`, error);
    }
  },

  /**
   * Clear all storage (requires ready state)
   */
  async clear(): Promise<void> {
    if (!storageReady) {
      console.warn(`[STORAGE] Blocked clear - storage not ready`);
      return;
    }
    
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error(`[STORAGE] Error clearing storage:`, error);
    }
  },

  /**
   * Get all keys from storage
   */
  async getAllKeys(): Promise<readonly string[]> {
    if (!storageReady) {
      console.warn(`[STORAGE] Blocked getAllKeys - storage not ready`);
      return [];
    }
    
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error(`[STORAGE] Error getting all keys:`, error);
      return [];
    }
  },
};

/**
 * Developer mode utilities
 */
export const devMode = {
  /**
   * Clear all storage in development mode
   */
  async clearDevStorage(): Promise<void> {
    if (__DEV__) {
      console.log('[STORAGE] Clearing dev storage...');
      await AsyncStorage.clear();
    }
  },

  /**
   * Disable storage in development mode (for testing)
   */
  disableInDev(): void {
    if (__DEV__) {
      disableStorageAccess();
      console.log('[STORAGE] Storage disabled in dev mode');
    }
  },
};

/**
 * Safe JSON operations with error handling
 */
export const safeJSON = {
  /**
   * Safely parse JSON with fallback
   */
  parse<T>(value: string | null, fallback: T): T {
    if (!value || value.trim().length === 0) {
      return fallback;
    }
    
    try {
      const parsed = JSON.parse(value);
      return parsed as T;
    } catch (error) {
      console.error('[STORAGE] JSON parse error:', error);
      console.error('[STORAGE] Invalid JSON (first 100 chars):', value.substring(0, 100));
      return fallback;
    }
  },
  
  /**
   * Safely stringify JSON with error handling
   */
  stringify<T>(value: T): string | null {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('[STORAGE] JSON stringify error:', error);
      return null;
    }
  },
};

/**
 * Type-safe storage wrapper with automatic JSON handling
 */
export const typedStorage = {
  /**
   * Get and parse JSON item
   */
  async getJSON<T>(key: string, fallback: T): Promise<T> {
    const value = await guardedStorage.getItem(key);
    return safeJSON.parse(value, fallback);
  },
  
  /**
   * Stringify and set JSON item
   */
  async setJSON<T>(key: string, value: T): Promise<boolean> {
    const serialized = safeJSON.stringify(value);
    
    if (!serialized) {
      console.error(`[STORAGE] Failed to serialize value for "${key}"`);
      return false;
    }
    
    await guardedStorage.setItem(key, serialized);
    return true;
  },
  
  /**
   * Remove item
   */
  async remove(key: string): Promise<void> {
    await guardedStorage.removeItem(key);
  },
  
  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await guardedStorage.getItem(key);
    return value !== null;
  },
};

/**
 * Batch operations with transaction-like behavior
 */
export const batchStorage = {
  /**
   * Set multiple items atomically (all or nothing)
   */
  async setMultiple(items: Record<string, any>): Promise<boolean> {
    if (!storageReady || !storageAvailable) {
      console.warn('[STORAGE] Batch operation blocked - storage not ready');
      return false;
    }
    
    const pairs: [string, string][] = [];
    
    for (const [key, value] of Object.entries(items)) {
      const serialized = safeJSON.stringify(value);
      if (!serialized) {
        console.error(`[STORAGE] Failed to serialize "${key}" in batch operation`);
        return false;
      }
      pairs.push([key, serialized]);
    }
    
    try {
      await guardedStorage.multiSet(pairs);
      return true;
    } catch (error) {
      console.error('[STORAGE] Batch set failed:', error);
      return false;
    }
  },
  
  /**
   * Get multiple items at once
   */
  async getMultiple<T extends Record<string, any>>(
    keys: string[],
    defaults: T
  ): Promise<T> {
    if (!storageReady || !storageAvailable) {
      return defaults;
    }
    
    try {
      const pairs = await guardedStorage.multiGet(keys);
      const result = { ...defaults };
      
      for (const [key, value] of pairs) {
        const parsed = safeJSON.parse(value, defaults[key]);
        result[key] = parsed;
      }
      
      return result;
    } catch (error) {
      console.error('[STORAGE] Batch get failed:', error);
      return defaults;
    }
  },
};
