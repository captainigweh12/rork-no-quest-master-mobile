/**
 * MMKV Storage Module
 * 
 * High-performance key-value storage using react-native-mmkv.
 * Much faster than AsyncStorage for all operations.
 * Requires development build (does not work in Expo Go).
 */

import { createMMKV } from 'react-native-mmkv';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

// MMKV instance
let storage: ReturnType<typeof createMMKV> | null = null;
let storageReady = false;
let storageAvailable = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize MMKV storage
 */
async function initializeStorage(): Promise<void> {
  try {
    console.log('[MMKV] Initializing storage...');
    
    storage = createMMKV({
      id: 'default-storage'
    });
    
  // Test storage
  storage.set('test-key', 'test-value');
  storage.remove('test-key');
    console.log('[MMKV] Storage test successful');
    
    storageReady = true;
    storageAvailable = true;
  } catch (error) {
    console.error('[MMKV] Failed to initialize:', error);
    storageAvailable = false;
    throw new Error('MMKV not available - ensure you are using a development build');
  }
}

/**
 * Initialize storage system
 */
export async function initAppStorage(): Promise<void> {
  if (initializationPromise) {
    console.log('[MMKV] Waiting for existing initialization');
    return initializationPromise;
  }

  console.log('[MMKV] Starting initialization...');
  
  initializationPromise = (async () => {
    try {
      await initializeStorage();
      console.log('[MMKV] Initialization complete');
    } catch (error) {
      console.error('[MMKV] Initialization failed:', error);
      throw error;
    }
  })();

  return initializationPromise;
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
 * Reset storage state
 */
export function resetStorage(): void {
  storage = null;
  storageReady = false;
  storageAvailable = false;
  initializationPromise = null;
}

/**
 * Guarded storage interface
 */
export const guardedStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!storage || !storageAvailable) {
      throw new Error('MMKV not available - ensure you are using a development build');
    }
    try {
      return storage.getString(key) ?? null;
    } catch (error) {
      console.error(`[MMKV] Error reading ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!storage || !storageAvailable) {
      throw new Error('MMKV not available - ensure you are using a development build');
    }
    try {
      storage.set(key, value);
    } catch (error) {
      console.error(`[MMKV] Error writing ${key}:`, error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!storage || !storageAvailable) {
      throw new Error('MMKV not available - ensure you are using a development build');
    }
    try {
      storage.remove(key);
    } catch (error) {
      console.error(`[MMKV] Error removing ${key}:`, error);
      throw error;
    }
  },

  async getAllKeys(): Promise<string[]> {
    if (!storage || !storageAvailable) {
      throw new Error('MMKV not available - ensure you are using a development build');
    }
    try {
      return storage.getAllKeys();
    } catch (error) {
      console.error('[MMKV] Error getting all keys:', error);
      return [];
    }
  },

  async clear(): Promise<void> {
    if (!storage || !storageAvailable) {
      throw new Error('MMKV not available - ensure you are using a development build');
    }
    try {
      storage.clearAll();
    } catch (error) {
      console.error('[MMKV] Error clearing storage:', error);
      throw error;
    }
  },

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    if (!storage || !storageAvailable) {
      throw new Error('MMKV not available - ensure you are using a development build');
    }
    try {
      return keys.map(key => [key, storage!.getString(key) ?? null]);
    } catch (error) {
      console.error('[MMKV] Error in multiGet:', error);
      return keys.map(key => [key, null]);
    }
  },

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    if (!storage || !storageAvailable) {
      throw new Error('MMKV not available - ensure you are using a development build');
    }
    try {
      for (const [key, value] of keyValuePairs) {
        storage.set(key, value);
      }
    } catch (error) {
      console.error('[MMKV] Error in multiSet:', error);
      throw error;
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    if (!storage || !storageAvailable) {
      throw new Error('MMKV not available - ensure you are using a development build');
    }
    try {
      for (const key of keys) {
        storage.remove(key);
      }
    } catch (error) {
      console.error('[MMKV] Error in multiRemove:', error);
      throw error;
    }
  }
};

/**
 * Typed storage interface for JSON values
 */
export const typedStorage = {
  async getJSON<T>(key: string, defaultValue: T): Promise<T> {
    const value = await guardedStorage.getItem(key);
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`[MMKV] Error parsing JSON for ${key}:`, e);
      return defaultValue;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await guardedStorage.setItem(key, serialized);
    } catch (e) {
      console.error(`[MMKV] Error stringifying JSON for ${key}:`, e);
      throw e;
    }
  }
};

/**
 * Batch storage operations interface
 */
export const batchStorage = {
  async getMultiple<T extends Record<string, any>>(keys: string[], defaultValues: T): Promise<T> {
    const result: Record<string, any> = {};
    const pairs = await guardedStorage.multiGet(keys);
    pairs.forEach(([key, value]) => {
      if (value === null) {
        result[key] = defaultValues[key];
      } else {
        try {
          result[key] = JSON.parse(value);
        } catch (e) {
          console.error(`[MMKV] Error parsing JSON for ${key}:`, e);
          result[key] = defaultValues[key];
        }
      }
    });
    return result as T;
  },

  async setMultiple<T extends Record<string, any>>(values: T): Promise<void> {
    const pairs: [string, string][] = [];
    for (const [key, value] of Object.entries(values)) {
      try {
        pairs.push([key, JSON.stringify(value)]);
      } catch (e) {
        console.error(`[MMKV] Error stringifying JSON for ${key}:`, e);
        throw e;
      }
    }
    await guardedStorage.multiSet(pairs);
  }
};