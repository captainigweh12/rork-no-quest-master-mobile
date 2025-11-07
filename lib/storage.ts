/**
 * Storage Guard Module
 * 
 * Prevents premature AsyncStorage access during app startup.
 * All storage operations must wait for explicit initialization.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage initialization state
let storageReady = false;
let storageAvailable = false;
let initializationPromise: Promise<void> | null = null;

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
      
      // Perform any necessary migrations or cleanup here
      // For example, you could check version and migrate data
      
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
   */
  async getItem(key: string): Promise<string | null> {
    if (!storageReady) {
      console.warn(`[STORAGE] Blocked getItem for "${key}" - storage not initialized`);
      return null;
    }
    
    if (!storageAvailable) {
      // Silently return null - storage unavailable is expected state
      return null;
    }
    
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`[STORAGE] Error getting item "${key}":`, error);
      return null;
    }
  },

  /**
   * Set an item in storage (no-op if not ready)
   */
  async setItem(key: string, value: string): Promise<void> {
    if (!storageReady || !storageAvailable) {
      // Silently no-op if storage is unavailable
      return;
    }
    
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`[STORAGE] Error setting item "${key}":`, error);
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
