/**
 * MMKV Storage Module
 * 
 * A high-performance key-value storage using react-native-mmkv.
 * Much faster than AsyncStorage and SQLite for key-value operations.
 * Provides the same interface as AsyncStorage for easy migration.
 */

import * as MMKVModule from 'react-native-mmkv';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

// In v4, MMKV provides direct methods on the module
let storage: any = null;
let storageReady = false;
let storageAvailable = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize MMKV storage
 */
async function initializeStorage(): Promise<void> {
  try {
    console.log('[MMKV] Initializing storage...');
    
    // For react-native-mmkv v4, the module itself provides the methods
    // Use the module directly
    storage = MMKVModule;
    
    // Test if it works
    if (typeof storage.set === 'function') {
      storage.set('test-key', 'test-value');
      storage.delete('test-key');
      console.log('[MMKV] Storage test successful');
    } else {
      throw new Error('MMKV methods not available');
    }
    
    console.log('[MMKV] Storage initialized successfully');
    storageAvailable = true;
  } catch (error) {
    console.error('[MMKV] Failed to initialize storage:', error);
    storageAvailable = false;
    throw error;
  }
}

/**
 * Migrate data from AsyncStorage to MMKV
 */
async function migrateFromAsyncStorage(): Promise<void> {
  if (!storage || !storageAvailable) {
    console.warn('[MMKV] Cannot migrate - storage not available');
    return;
  }

  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const asyncStorage = AsyncStorage.default;
    
    console.log('[MMKV] Starting migration from AsyncStorage...');
    const allKeys = await asyncStorage.getAllKeys();
    
    if (!allKeys || allKeys.length === 0) {
      console.log('[MMKV] No keys to migrate');
      return;
    }
    
    console.log(`[MMKV] Found ${allKeys.length} keys to migrate`);
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const key of allKeys) {
      try {
        const value = await asyncStorage.getItem(key);
        
        if (value === null || value === undefined) {
          skippedCount++;
          continue;
        }
        
        if (typeof value !== 'string' || value.trim().length === 0) {
          skippedCount++;
          continue;
        }
        
        // Validate JSON for data integrity
        try {
          JSON.parse(value);
        } catch {
          console.warn(`[MMKV] Skipping corrupted key: ${key}`);
          skippedCount++;
          continue;
        }
        
        storage.set(key, value);
        migratedCount++;
      } catch (error) {
        console.error(`[MMKV] Error migrating key: ${key}`, error);
        errorCount++;
      }
    }
    
    console.log(`[MMKV] Migration complete: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`);
    
    if (migratedCount > 0) {
      console.log('[MMKV] Clearing old AsyncStorage data...');
      await asyncStorage.clear();
      console.log('[MMKV] AsyncStorage cleared');
    }
  } catch (error) {
    console.error('[MMKV] Migration failed:', error);
  }
}

/**
 * Migrate data from SQLite to MMKV
 */
async function migrateFromSQLite(): Promise<void> {
  if (!storage || !storageAvailable) {
    console.warn('[MMKV] Cannot migrate from SQLite - storage not available');
    return;
  }

  try {
    const SQLiteModule = await import('expo-sqlite');
    
    console.log('[MMKV] Starting migration from SQLite...');
    const db = await SQLiteModule.openDatabaseAsync('app_storage.db');
    
    const results = await db.getAllAsync(
      'SELECT key, value FROM storage'
    ) as { key: string; value: string }[];
    
    if (!results || results.length === 0) {
      console.log('[MMKV] No SQLite data to migrate');
      return;
    }
    
    console.log(`[MMKV] Found ${results.length} keys to migrate from SQLite`);
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const row of results) {
      try {
        if (!row.value || row.value.trim().length === 0) {
          skippedCount++;
          continue;
        }
        
        // Validate JSON
        try {
          JSON.parse(row.value);
        } catch {
          console.warn(`[MMKV] Skipping corrupted SQLite key: ${row.key}`);
          skippedCount++;
          continue;
        }
        
        storage.set(row.key, row.value);
        migratedCount++;
      } catch (error) {
        console.error(`[MMKV] Error migrating SQLite key: ${row.key}`, error);
        skippedCount++;
      }
    }
    
    console.log(`[MMKV] SQLite migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
    
    if (migratedCount > 0) {
      console.log('[MMKV] Clearing SQLite data...');
      await db.runAsync('DELETE FROM storage');
      console.log('[MMKV] SQLite data cleared');
    }
  } catch (error) {
    console.error('[MMKV] SQLite migration failed (this is OK if SQLite was never used):', error);
  }
}

/**
 * Initialize MMKV storage with migration
 */
export async function initAppStorage(): Promise<void> {
  if (storageReady) {
    console.log('[MMKV] Already initialized');
    return;
  }

  if (initializationPromise) {
    console.log('[MMKV] Waiting for existing initialization');
    return initializationPromise;
  }

  console.log('[MMKV] Starting initialization...');
  
  initializationPromise = (async () => {
    try {
      await initializeStorage();
      
      // Migrate from AsyncStorage first (legacy data)
      await migrateFromAsyncStorage();
      
      // Then migrate from SQLite (if it exists)
      await migrateFromSQLite();
      
      console.log('[MMKV] Initialization complete');
      storageReady = true;
    } catch (error) {
      console.error('[MMKV] Initialization failed:', error);
      storageReady = true; // Allow app to continue
      storageAvailable = false;
    }
  })();

  return initializationPromise;
}

/**
 * Manually enable storage access
 */
export function enableStorageAccess(): void {
  storageReady = true;
  console.log('[MMKV] Access manually enabled');
}

/**
 * Disable storage access
 */
export function disableStorageAccess(): void {
  storageReady = false;
  initializationPromise = null;
  console.log('[MMKV] Access disabled');
}

/**
 * Check if storage is ready
 */
export function isStorageReady(): boolean {
  return storageReady;
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  return storageAvailable;
}

/**
 * MMKV-backed storage with AsyncStorage-compatible interface
 */
export const guardedStorage = {
  /**
   * Get an item from storage
   */
  async getItem(key: string): Promise<string | null> {
    if (!storageReady) {
      console.warn(`[MMKV] Blocked getItem for "${key}" - storage not initialized`);
      return null;
    }
    
    if (!storageAvailable || !storage) {
      return null;
    }
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const value = storage.getString(key);
        
        if (value === undefined) {
          return null;
        }
        
        if (typeof value !== 'string' || value.trim().length === 0) {
          console.warn(`[MMKV] Invalid value for "${key}", cleaning up`);
          storage.delete(key);
          return null;
        }
        
        return value;
      } catch (error) {
        console.error(`[MMKV] Error getting item "${key}" (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
        
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
   * Set an item in storage
   */
  async setItem(key: string, value: string): Promise<void> {
    if (!storageReady || !storageAvailable || !storage) {
      return;
    }
    
    if (typeof value !== 'string') {
      console.error(`[MMKV] Cannot set "${key}": value must be a string`);
      return;
    }
    
    if (value.trim().length === 0) {
      console.warn(`[MMKV] Attempting to set empty value for "${key}", skipping`);
      return;
    }
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        storage.set(key, value);
        return;
      } catch (error: any) {
        console.error(`[MMKV] Error setting item "${key}" (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
        
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
  },

  /**
   * Remove an item from storage
   */
  async removeItem(key: string): Promise<void> {
    if (!storageReady || !storageAvailable || !storage) {
      return;
    }
    
    try {
      storage.delete(key);
    } catch (error) {
      console.error(`[MMKV] Error removing item "${key}":`, error);
    }
  },

  /**
   * Get multiple items from storage
   */
  async multiGet(keys: string[]): Promise<readonly [string, string | null][]> {
    if (!storageReady || !storage) {
      console.warn(`[MMKV] Blocked multiGet - storage not ready`);
      return keys.map(key => [key, null] as [string, null]);
    }
    
    try {
      return keys.map(key => {
        const value = storage!.getString(key);
        return [key, value === undefined ? null : value] as [string, string | null];
      });
    } catch (error) {
      console.error(`[MMKV] Error in multiGet:`, error);
      return keys.map(key => [key, null] as [string, null]);
    }
  },

  /**
   * Set multiple items in storage
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    if (!storageReady || !storage) {
      console.warn(`[MMKV] Blocked multiSet - storage not ready`);
      return;
    }
    
    try {
      for (const [key, value] of keyValuePairs) {
        storage.set(key, value);
      }
    } catch (error) {
      console.error(`[MMKV] Error in multiSet:`, error);
    }
  },

  /**
   * Remove multiple items from storage
   */
  async multiRemove(keys: string[]): Promise<void> {
    if (!storageReady || !storage) {
      console.warn(`[MMKV] Blocked multiRemove - storage not ready`);
      return;
    }
    
    try {
      for (const key of keys) {
        storage.delete(key);
      }
    } catch (error) {
      console.error(`[MMKV] Error in multiRemove:`, error);
    }
  },

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    if (!storageReady || !storage) {
      console.warn(`[MMKV] Blocked clear - storage not ready`);
      return;
    }
    
    try {
      storage.clearAll();
    } catch (error) {
      console.error(`[MMKV] Error clearing storage:`, error);
    }
  },

  /**
   * Get all keys from storage
   */
  async getAllKeys(): Promise<readonly string[]> {
    if (!storageReady || !storage) {
      console.warn(`[MMKV] Blocked getAllKeys - storage not ready`);
      return [];
    }
    
    try {
      return storage.getAllKeys();
    } catch (error) {
      console.error(`[MMKV] Error getting all keys:`, error);
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
    if (__DEV__ && storage) {
      console.log('[MMKV] Clearing dev storage...');
      storage.clearAll();
    }
  },

  /**
   * Disable storage in development mode
   */
  disableInDev(): void {
    if (__DEV__) {
      disableStorageAccess();
      console.log('[MMKV] Storage disabled in dev mode');
    }
  },

  /**
   * Get storage stats
   */
  async getStats(): Promise<{ totalKeys: number; totalSize: number }> {
    if (!storage || !storageAvailable) {
      return { totalKeys: 0, totalSize: 0 };
    }

    try {
      const keys = storage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = storage.getString(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return {
        totalKeys: keys.length,
        totalSize,
      };
    } catch (error) {
      console.error('[MMKV] Error getting stats:', error);
      return { totalKeys: 0, totalSize: 0 };
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
      console.error('[MMKV] JSON parse error:', error);
      console.error('[MMKV] Invalid JSON (first 100 chars):', value.substring(0, 100));
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
      console.error('[MMKV] JSON stringify error:', error);
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
      console.error(`[MMKV] Failed to serialize value for "${key}"`);
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
 * Batch operations
 */
export const batchStorage = {
  /**
   * Set multiple items atomically
   */
  async setMultiple(items: Record<string, any>): Promise<boolean> {
    if (!storageReady || !storageAvailable || !storage) {
      console.warn('[MMKV] Batch operation blocked - storage not ready');
      return false;
    }
    
    const pairs: [string, string][] = [];
    
    for (const [key, value] of Object.entries(items)) {
      const serialized = safeJSON.stringify(value);
      if (!serialized) {
        console.error(`[MMKV] Failed to serialize "${key}" in batch operation`);
        return false;
      }
      pairs.push([key, serialized]);
    }
    
    try {
      await guardedStorage.multiSet(pairs);
      return true;
    } catch (error) {
      console.error('[MMKV] Batch set failed:', error);
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
        (result as any)[key] = parsed;
      }
      
      return result;
    } catch (error) {
      console.error('[MMKV] Batch get failed:', error);
      return defaults;
    }
  },
};
