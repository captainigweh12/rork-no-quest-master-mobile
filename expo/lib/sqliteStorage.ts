// @ts-nocheck
/**
 * SQLite Storage Module
 * 
 * A faster, more reliable alternative to AsyncStorage using SQLite.
 * Provides the same interface as AsyncStorage for easy migration.
 */

import * as SQLite from 'expo-sqlite';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

let db: SQLite.SQLiteDatabase | null = null;
let storageReady = false;
let storageAvailable = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the SQLite database
 */
async function initializeDatabase(): Promise<void> {
  try {
    console.log('[SQLITE] Opening database...');
    
    db = await SQLite.openDatabaseAsync('app_storage.db');
    
    console.log('[SQLITE] Creating key-value table...');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_storage_key ON storage(key);
    `);
    
    console.log('[SQLITE] Database initialized successfully');
    storageAvailable = true;
  } catch (error) {
    console.error('[SQLITE] Failed to initialize database:', error);
    storageAvailable = false;
    throw error;
  }
}

/**
 * Migrate data from AsyncStorage to SQLite
 */
async function migrateFromAsyncStorage(): Promise<void> {
  if (!db || !storageAvailable) {
    console.warn('[SQLITE] Cannot migrate - database not available');
    return;
  }

  try {
  const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
  const storage = AsyncStorageModule.default;
    
    console.log('[SQLITE] Starting migration from AsyncStorage...');
    
    // Try to get keys - if this fails with SyntaxError, AsyncStorage is corrupted
    let allKeys: readonly string[];
    try {
      allKeys = await storage.getAllKeys();
    } catch (keysError: any) {
      console.error('[SQLITE] Failed to read AsyncStorage keys:', keysError.message);
      if (keysError.message?.includes('SyntaxError') || keysError.message?.includes("';' expected")) {
        console.log('[SQLITE] AsyncStorage appears corrupted, clearing it...');
        try {
          await storage.clear();
          console.log('[SQLITE] AsyncStorage cleared due to corruption');
        } catch (clearError) {
          console.error('[SQLITE] Failed to clear corrupted AsyncStorage:', clearError);
        }
      }
      return;
    }
    
    if (!allKeys || allKeys.length === 0) {
      console.log('[SQLITE] No keys to migrate');
      return;
    }
    
    console.log(`[SQLITE] Found ${allKeys.length} keys to migrate`);
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const key of allKeys) {
      try {
        let value: string | null;
        try {
          value = await storage.getItem(key);
        } catch (getError: any) {
          console.warn(`[SQLITE] Failed to read key "${key}":`, getError.message);
          errorCount++;
          continue;
        }
        
        if (value === null || value === undefined) {
          skippedCount++;
          continue;
        }
        
        if (typeof value !== 'string' || value.trim().length === 0) {
          skippedCount++;
          continue;
        }
        
        try {
          JSON.parse(value);
        } catch {
          console.warn(`[SQLITE] Skipping corrupted key: ${key}`);
          skippedCount++;
          continue;
        }
        
        await db.runAsync(
          'INSERT OR REPLACE INTO storage (key, value) VALUES (?, ?)',
          [key, value]
        );
        
        migratedCount++;
      } catch (error) {
        console.error(`[SQLITE] Error migrating key: ${key}`, error);
        errorCount++;
      }
    }
    
    console.log(`[SQLITE] Migration complete: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`);
    
    if (migratedCount > 0) {
      console.log('[SQLITE] Clearing old AsyncStorage data...');
      try {
        await storage.clear();
        console.log('[SQLITE] AsyncStorage cleared');
      } catch (clearError) {
        console.error('[SQLITE] Failed to clear AsyncStorage after migration:', clearError);
      }
    }
  } catch (error: any) {
    console.error('[SQLITE] Migration failed:', error.message || error);
    // Don't throw - we want the app to continue even if migration fails
  }
}

/**
 * Initialize SQLite storage
 */
export async function initAppStorage(): Promise<void> {
  if (storageReady) {
    console.log('[SQLITE] Already initialized');
    return;
  }

  if (initializationPromise) {
    console.log('[SQLITE] Waiting for existing initialization');
    return initializationPromise;
  }

  console.log('[SQLITE] Starting initialization...');
  
  initializationPromise = (async () => {
    try {
      await initializeDatabase();
      
      await migrateFromAsyncStorage();
      
      console.log('[SQLITE] Initialization complete');
      storageReady = true;
    } catch (error) {
      console.error('[SQLITE] Initialization failed:', error);
      storageReady = true;
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
  console.log('[SQLITE] Access manually enabled');
}

/**
 * Disable storage access
 */
export function disableStorageAccess(): void {
  storageReady = false;
  initializationPromise = null;
  console.log('[SQLITE] Access disabled');
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
 * SQLite-backed storage with AsyncStorage-compatible interface
 */
export const guardedStorage = {
  /**
   * Get an item from storage
   */
  async getItem(key: string): Promise<string | null> {
    if (!storageReady) {
      console.warn(`[SQLITE] Blocked getItem for "${key}" - storage not initialized`);
      return null;
    }
    
    if (!storageAvailable || !db) {
      return null;
    }
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await new Promise<{ value: string } | null>((resolve, reject) => {
          db!.transaction(tx => {
            tx.executeSql('SELECT value FROM storage WHERE key = ?', [key], (_, rs) => {
              if (rs.rows.length === 0) return resolve(null);
              resolve({ value: rs.rows.item(0).value as string });
            }, (_, err) => { reject(err); return false; });
          });
        });
        
        if (!result) {
          return null;
        }
        
        const value = result.value;
        
        if (typeof value !== 'string' || value.trim().length === 0) {
          console.warn(`[SQLITE] Invalid value for "${key}", cleaning up`);
          await new Promise<void>((resolve, reject) => {
            db!.transaction(tx => {
              tx.executeSql('DELETE FROM storage WHERE key = ?', [key], () => resolve(), (_, err) => { reject(err); return false; });
            });
          });
          return null;
        }
        
        return value;
      } catch (error) {
        console.error(`[SQLITE] Error getting item "${key}" (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
        
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
    if (!storageReady || !storageAvailable || !db) {
      return;
    }
    
    if (typeof value !== 'string') {
      console.error(`[SQLITE] Cannot set "${key}": value must be a string`);
      return;
    }
    
    if (value.trim().length === 0) {
      console.warn(`[SQLITE] Attempting to set empty value for "${key}", skipping`);
      return;
    }
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          db!.transaction(tx => {
            tx.executeSql(
              'INSERT OR REPLACE INTO storage (key, value, updated_at) VALUES (?, ?, strftime(\'%s\', \'now\'))',
              [key, value],
              () => resolve(),
              (_, err) => { reject(err); return false; }
            );
          });
        });
        return;
      } catch (error: any) {
        console.error(`[SQLITE] Error setting item "${key}" (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);
        
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
    if (!storageReady || !storageAvailable || !db) {
      return;
    }
    
    try {
      await new Promise<void>((resolve, reject) => {
        db!.transaction(tx => {
          tx.executeSql('DELETE FROM storage WHERE key = ?', [key], () => resolve(), (_, err) => { reject(err); return false; });
        });
      });
    } catch (error) {
      console.error(`[SQLITE] Error removing item "${key}":`, error);
    }
  },

  /**
   * Get multiple items from storage
   */
  async multiGet(keys: string[]): Promise<readonly [string, string | null][]> {
    if (!storageReady || !db) {
      console.warn(`[SQLITE] Blocked multiGet - storage not ready`);
      return keys.map(key => [key, null] as [string, null]);
    }
    
    try {
      const placeholders = keys.map(() => '?').join(',');
      const results = await new Promise<Array<{ key: string; value: string }>>((resolve, reject) => {
        db!.transaction(tx => {
          tx.executeSql(
            `SELECT key, value FROM storage WHERE key IN (${placeholders})`,
            keys,
            (_, rs) => {
              const arr: Array<{ key: string; value: string }> = [];
              for (let i = 0; i < rs.rows.length; i++) {
                const row = rs.rows.item(i) as any;
                arr.push({ key: row.key as string, value: row.value as string });
              }
              resolve(arr);
            },
            (_, err) => { reject(err); return false; }
          );
        });
      });
      const resultMap = new Map(results.map(r => [r.key, r.value]));
      return keys.map(key => [key, resultMap.get(key) ?? null] as [string, string | null]);
    } catch (error) {
      console.error(`[SQLITE] Error in multiGet:`, error);
      return keys.map(key => [key, null] as [string, null]);
    }
  },

  /**
   * Set multiple items in storage
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    if (!storageReady || !db) {
      console.warn(`[SQLITE] Blocked multiSet - storage not ready`);
      return;
    }
    
    try {
      await new Promise<void>((resolve, reject) => {
        db!.transaction(tx => {
          for (const [key, value] of keyValuePairs) {
            tx.executeSql(
              'INSERT OR REPLACE INTO storage (key, value, updated_at) VALUES (?, ?, strftime(\'%s\', \'now\'))',
              [key, value]
            );
          }
        }, err => reject(err), () => resolve());
      });
    } catch (error) {
      console.error(`[SQLITE] Error in multiSet:`, error);
    }
  },

  /**
   * Remove multiple items from storage
   */
  async multiRemove(keys: string[]): Promise<void> {
    if (!storageReady || !db) {
      console.warn(`[SQLITE] Blocked multiRemove - storage not ready`);
      return;
    }
    
    try {
      const placeholders = keys.map(() => '?').join(',');
      await new Promise<void>((resolve, reject) => {
        db!.transaction(tx => {
          tx.executeSql(`DELETE FROM storage WHERE key IN (${placeholders})`, keys, () => resolve(), (_, err) => { reject(err); return false; });
        });
      });
    } catch (error) {
      console.error(`[SQLITE] Error in multiRemove:`, error);
    }
  },

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    if (!storageReady || !db) {
      console.warn(`[SQLITE] Blocked clear - storage not ready`);
      return;
    }
    
    try {
      await new Promise<void>((resolve, reject) => {
        db!.transaction(tx => {
          tx.executeSql('DELETE FROM storage', [], () => resolve(), (_, err) => { reject(err); return false; });
        });
      });
    } catch (error) {
      console.error(`[SQLITE] Error clearing storage:`, error);
    }
  },

  /**
   * Get all keys from storage
   */
  async getAllKeys(): Promise<readonly string[]> {
    if (!storageReady || !db) {
      console.warn(`[SQLITE] Blocked getAllKeys - storage not ready`);
      return [];
    }
    
    try {
      const results = await new Promise<Array<{ key: string }>>((resolve, reject) => {
        db!.transaction(tx => {
          tx.executeSql('SELECT key FROM storage', [], (_, rs) => {
            const arr: Array<{ key: string }> = [];
            for (let i = 0; i < rs.rows.length; i++) {
              const row = rs.rows.item(i) as any;
              arr.push({ key: row.key as string });
            }
            resolve(arr);
          }, (_, err) => { reject(err); return false; });
        });
      });
      return results.map(r => r.key);
    } catch (error) {
      console.error(`[SQLITE] Error getting all keys:`, error);
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
    if (__DEV__ && db) {
      console.log('[SQLITE] Clearing dev storage...');
      await db.runAsync('DELETE FROM storage');
    }
  },

  /**
   * Disable storage in development mode
   */
  disableInDev(): void {
    if (__DEV__) {
      disableStorageAccess();
      console.log('[SQLITE] Storage disabled in dev mode');
    }
  },

  /**
   * Get storage stats
   */
  async getStats(): Promise<{ totalKeys: number; totalSize: number }> {
    if (!db || !storageAvailable) {
      return { totalKeys: 0, totalSize: 0 };
    }

    try {
      const result = await db.getFirstAsync<{ count: number; size: number }>(
        'SELECT COUNT(*) as count, SUM(LENGTH(value)) as size FROM storage'
      );
      
      return {
        totalKeys: result?.count || 0,
        totalSize: result?.size || 0,
      };
    } catch (error) {
      console.error('[SQLITE] Error getting stats:', error);
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
      console.error('[SQLITE] JSON parse error:', error);
      console.error('[SQLITE] Invalid JSON (first 100 chars):', value.substring(0, 100));
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
      console.error('[SQLITE] JSON stringify error:', error);
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
      console.error(`[SQLITE] Failed to serialize value for "${key}"`);
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
 * Batch operations with transaction support
 */
export const batchStorage = {
  /**
   * Set multiple items atomically
   */
  async setMultiple(items: Record<string, any>): Promise<boolean> {
    if (!storageReady || !storageAvailable || !db) {
      console.warn('[SQLITE] Batch operation blocked - storage not ready');
      return false;
    }
    
    const pairs: [string, string][] = [];
    
    for (const [key, value] of Object.entries(items)) {
      const serialized = safeJSON.stringify(value);
      if (!serialized) {
        console.error(`[SQLITE] Failed to serialize "${key}" in batch operation`);
        return false;
      }
      pairs.push([key, serialized]);
    }
    
    try {
      await guardedStorage.multiSet(pairs);
      return true;
    } catch (error) {
      console.error('[SQLITE] Batch set failed:', error);
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
      console.error('[SQLITE] Batch get failed:', error);
      return defaults;
    }
  },
};
