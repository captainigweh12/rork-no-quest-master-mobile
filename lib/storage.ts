/**
 * Adaptive Storage Router
 * 
 * Automatically selects the best storage backend based on runtime:
 * - Expo Go: AsyncStorage + SecureStore (MMKV unavailable)
 * - Custom Dev Client / Production: MMKV (fast, JSI-backed)
 * - Web: AsyncStorage polyfill
 * 
 * This allows the app to work in Expo Go while still benefiting from
 * MMKV's performance in custom dev clients and production builds.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Keys that should always use SecureStore (keychain/keystore)
const SECRET_KEYS = new Set<string>([
  'auth:access_token',
  'auth:refresh_token',
  'videosdk:token',
  'supabase:session',
  'user:auth',
]);

// Detect runtime environment
const isExpoGo = Constants.appOwnership === 'expo';
const isWeb = Platform.OS === 'web';
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Storage backend type
type StorageBackend = 'MMKV' | 'AsyncStorage' | 'SecureStore';

// Try to load MMKV only on native AND not in Expo Go
let mmkvInstance: any | null = null;
let storageBackend: StorageBackend = 'AsyncStorage';

// Lazy initialization guard to prevent double-instantiate during hot reload
function getMMKV(): any | null {
  if (mmkvInstance) return mmkvInstance;
  
  // Dev mode override for debugging (simulate Expo Go in custom client)
  if (__DEV__ && process.env.EXPO_PUBLIC_FORCE_ASYNC === 'true') {
    console.log('🔧 Storage backend: AsyncStorage (dev override)');
    return null;
  }
  
  if (!isExpoGo && !isWeb && isNative) {
    try {
      // Use require() instead of import to prevent Metro from bundling in Expo Go
      const { MMKV } = require('react-native-mmkv');
      mmkvInstance = new MMKV();
      storageBackend = 'MMKV';
      console.log('✅ Storage backend: MMKV (high-performance JSI)');
      
      // Performance benchmark
      if (__DEV__) {
        const t0 = Date.now();
        mmkvInstance.set('__perf_test__', 'test');
        const _ = mmkvInstance.getString('__perf_test__');
        mmkvInstance.delete('__perf_test__');
        console.log(`⚡ MMKV latency: ${Date.now() - t0}ms`);
      }
    } catch (error) {
      console.log('⚠️ MMKV unavailable, falling back to AsyncStorage');
      mmkvInstance = null;
      storageBackend = 'AsyncStorage';
    }
  } else if (isExpoGo) {
    console.log('📱 Storage backend: AsyncStorage (Expo Go)');
    storageBackend = 'AsyncStorage';
  } else if (isWeb) {
    console.log('🌐 Storage backend: AsyncStorage (Web)');
    storageBackend = 'AsyncStorage';
  }
  
  return mmkvInstance;
}

// Initialize on module load
const mmkv = getMMKV();

// Log storage backend on startup
export const getStorageBackend = (): StorageBackend => storageBackend;

// Storage initialization flag
let isInitialized = false;

/**
 * Initialize storage system
 */
export const initAppStorage = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    // Test storage operations
    const testKey = '__storage_test__';
    const testValue = Date.now().toString();

    if (mmkv) {
      mmkv.set(testKey, testValue);
      const retrieved = mmkv.getString(testKey);
      if (retrieved === testValue) {
        mmkv.delete(testKey);
        console.log('✅ MMKV storage initialized and verified');
      }
    } else {
      await AsyncStorage.setItem(testKey, testValue);
      const retrieved = await AsyncStorage.getItem(testKey);
      if (retrieved === testValue) {
        await AsyncStorage.removeItem(testKey);
        console.log('✅ AsyncStorage initialized and verified');
      }
    }

    isInitialized = true;
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
    throw error;
  }
};

/**
 * Check if storage is ready
 */
export const isStorageReady = (): boolean => isInitialized;

/**
 * Check if storage is available
 */
export const isStorageAvailable = (): boolean => {
  return mmkv !== null || isWeb || isExpoGo;
};

/**
 * Unified storage interface with automatic backend selection
 */
export const guardedStorage = {
  /**
   * Get item from storage with corruption protection
   */
  async getItem(key: string): Promise<string | null> {
    // MEGA TRY-CATCH: Prevent any error from crashing the app
    try {
      // Secrets → SecureStore on native (except web)
      if (SECRET_KEYS.has(key) && !isWeb) {
        try {
          const value = await SecureStore.getItemAsync(key);
          return value ?? null;
        } catch (error) {
          console.warn(`SecureStore.getItem failed for ${key}, falling through to regular storage:`, error);
          // Fall through to regular storage
        }
      }

      // Native with MMKV (custom dev client / production)
      if (mmkv) {
        try {
          const value = mmkv.getString(key) ?? null;
          // Validate it's not corrupted by attempting to parse if it looks like JSON
          if (value && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
            try {
              JSON.parse(value);
            } catch (parseError) {
              console.warn(`[STORAGE] Corrupted JSON in MMKV for key ${key}, removing`);
              try {
                mmkv.delete(key);
              } catch (deleteError) {
                console.error(`[STORAGE] Failed to delete corrupted key ${key}:`, deleteError);
              }
              return null;
            }
          }
          return value;
        } catch (error: any) {
          // If it's a SyntaxError, the value is severely corrupted
          if (error.message?.includes('SyntaxError') || error.message?.includes("';' expected")) {
            console.error(`[STORAGE] SyntaxError reading ${key}, clearing it:`, error.message);
            try {
              mmkv.delete(key);
            } catch (deleteError) {
              console.error(`[STORAGE] Failed to delete corrupted key ${key}`);
            }
            return null;
          }
          
          console.warn(`MMKV read error for key ${key}, falling back to AsyncStorage:`, error);
          // Fallback to AsyncStorage if MMKV fails
          try {
            const value = await AsyncStorage.getItem(key);
            // Validate AsyncStorage value too
            if (value && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
              try {
                JSON.parse(value);
              } catch (parseError) {
                console.warn(`[STORAGE] Corrupted JSON in AsyncStorage for key ${key}, removing`);
                try {
                  await AsyncStorage.removeItem(key);
                } catch (removeError) {
                  console.error(`[STORAGE] Failed to remove corrupted key ${key}`);
                }
                return null;
              }
            }
            return value;
          } catch (asyncError) {
            console.error(`[STORAGE] Both MMKV and AsyncStorage failed for ${key}:`, asyncError);
            return null;
          }
        }
      }

      // Web or Expo Go → AsyncStorage
      try {
        const value = await AsyncStorage.getItem(key);
        // Validate for corruption
        if (value && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
          try {
            JSON.parse(value);
          } catch (parseError) {
            console.warn(`[STORAGE] Corrupted JSON in AsyncStorage for key ${key}, removing`);
            try {
              await AsyncStorage.removeItem(key);
            } catch (removeError) {
              console.error(`[STORAGE] Failed to remove corrupted key ${key}`);
            }
            return null;
          }
        }
        return value;
      } catch (error: any) {
        // If it's a SyntaxError, the value is severely corrupted
        if (error.message?.includes('SyntaxError') || error.message?.includes("';' expected")) {
          console.error(`[STORAGE] SyntaxError reading ${key}:`, error.message);
          try {
            await AsyncStorage.removeItem(key);
          } catch (removeError) {
            console.error(`[STORAGE] Failed to remove corrupted key ${key}`);
          }
          return null;
        }
        throw error;
      }
    } catch (error: any) {
      // CRITICAL: Catch ALL errors including SyntaxError
      const errMsg = error?.message || String(error);
      
      // Special handling for SyntaxError
      if (errMsg.includes('SyntaxError') || errMsg.includes("';' expected")) {
        console.error(`[STORAGE] 🚨 SyntaxError reading ${key} - storage is corrupted:`, errMsg);
        
        // Try to delete the corrupted key
        try {
          await this.removeItem(key);
          console.log(`[STORAGE] ✅ Removed corrupted key: ${key}`);
        } catch (removeError) {
          console.error(`[STORAGE] ❌ Failed to remove corrupted key: ${key}`);
        }
        
        return null;
      }
      
      console.error(`[STORAGE] Fatal error getting ${key}:`, errMsg);
      return null;
    }
  },

  /**
   * Set item in storage with validation
   */
  async setItem(key: string, value: string): Promise<void> {
    // MEGA TRY-CATCH: Prevent any error from crashing the app
    try {
      // Validate value is not corrupted before storing
      if (value && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
        try {
          JSON.parse(value);
        } catch (parseError) {
          console.error(`[STORAGE] Attempted to store invalid JSON for key ${key}, aborting`);
          throw new Error(`Invalid JSON value for key ${key}`);
        }
      }

      // Secrets → SecureStore on native (except web)
      if (SECRET_KEYS.has(key) && !isWeb) {
        try {
          await SecureStore.setItemAsync(key, value);
          return;
        } catch (error) {
          console.warn(`SecureStore.setItem failed for ${key}, falling through to regular storage:`, error);
          // Fall through to regular storage
        }
      }

      // Native with MMKV
      if (mmkv) {
        try {
          mmkv.set(key, value);
          return;
        } catch (error) {
          console.warn(`MMKV write error for key ${key}, falling back to AsyncStorage:`, error);
          // Fallback to AsyncStorage if MMKV fails
          await AsyncStorage.setItem(key, value);
          return;
        }
      }

      // Web or Expo Go → AsyncStorage
      await AsyncStorage.setItem(key, value);
    } catch (error: any) {
      // CRITICAL: Catch ALL errors including SyntaxError
      const errMsg = error?.message || String(error);
      console.error(`[STORAGE] Fatal error setting ${key}:`, errMsg);
      
      // Don't throw - just log and return
      // Throwing could crash the app during initialization
      return;
    }
  },

  /**
   * Remove item from storage
   */
  async removeItem(key: string): Promise<void> {
    // MEGA TRY-CATCH: Prevent any error from crashing the app
    try {
    // Secrets → SecureStore on native
    if (SECRET_KEYS.has(key) && !isWeb) {
      try {
        await SecureStore.deleteItemAsync(key);
        return;
      } catch (error) {
        console.warn(`SecureStore.deleteItem failed for ${key}:`, error);
        // Fall through to regular storage
      }
    }

    // Native with MMKV
    if (mmkv) {
      try {
        mmkv.delete(key);
        return;
      } catch (error) {
        console.warn(`MMKV delete error for key ${key}, falling back to AsyncStorage:`, error);
        // Fallback to AsyncStorage if MMKV fails
        await AsyncStorage.removeItem(key);
        return;
      }
    }

    // Web or Expo Go → AsyncStorage
    await AsyncStorage.removeItem(key);
    } catch (error: any) {
      // CRITICAL: Catch ALL errors
      const errMsg = error?.message || String(error);
      console.error(`[STORAGE] Error removing ${key}:`, errMsg);
      // Don't throw - just log
    }
  },

  /**
   * Clear all non-secret storage
   */
  async clearAll(): Promise<void> {
    if (mmkv) {
      mmkv.clearAll();
      return;
    }
    await AsyncStorage.clear();
  },

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[]> {
    if (mmkv) {
      return mmkv.getAllKeys() as string[];
    }
    return (await AsyncStorage.getAllKeys()) as string[];
  },

  /**
   * Get multiple keys at once
   */
  async multiGet(keys: string[]): Promise<Array<[string, string | null]>> {
    if (mmkv) {
      return keys.map((k) => [k, mmkv.getString(k) ?? null]);
    }
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs as Array<[string, string | null]>;
  },

  /**
   * Set multiple key/value pairs at once
   */
  async multiSet(entries: Array<[string, string]>): Promise<void> {
    if (mmkv) {
      entries.forEach(([k, v]) => {
        if (SECRET_KEYS.has(k) && !isWeb) return; // secrets handled separately
        mmkv.set(k, v);
      });
      const secrets = entries.filter(([k]) => SECRET_KEYS.has(k) && !isWeb);
      await Promise.all(
        secrets.map(([k, v]) => SecureStore.setItemAsync(k, v).catch(() => {}))
      );
      return;
    }
    await AsyncStorage.multiSet(entries);
  },

  /**
   * Remove multiple keys at once
   */
  async multiRemove(keys: string[]): Promise<void> {
    if (mmkv) {
      keys.forEach((k) => mmkv.delete(k));
      if (!isWeb) {
        await Promise.all(
          keys
            .filter((k) => SECRET_KEYS.has(k))
            .map((k) => SecureStore.deleteItemAsync(k).catch(() => {}))
        );
      }
      return;
    }
    await AsyncStorage.multiRemove(keys);
  },
};

/**
 * Typed storage helpers
 */
export const typedStorage = {
  /**
   * Store JSON data
   */
  async setJSON<T>(key: string, value: T): Promise<void> {
    await guardedStorage.setItem(key, JSON.stringify(value));
  },

  /**
   * Retrieve JSON data
   */
  async getJSON<T>(key: string, fallback?: T): Promise<T | null> {
    const str = await guardedStorage.getItem(key);
    if (!str) return fallback ?? null;
    try {
      return JSON.parse(str) as T;
    } catch (error) {
      console.error(`Failed to parse JSON for key ${key}:`, error);
      return fallback ?? null;
    }
  },

  /**
   * Store number
   */
  async setNumber(key: string, value: number): Promise<void> {
    if (mmkv) {
      mmkv.set(key, value);
    } else {
      await guardedStorage.setItem(key, value.toString());
    }
  },

  /**
   * Retrieve number
   */
  async getNumber(key: string): Promise<number | null> {
    if (mmkv) {
      const value = mmkv.getNumber(key);
      return value ?? null;
    }
    const str = await guardedStorage.getItem(key);
    if (!str) return null;
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  },

  /**
   * Store boolean
   */
  async setBoolean(key: string, value: boolean): Promise<void> {
    if (mmkv) {
      mmkv.set(key, value);
    } else {
      await guardedStorage.setItem(key, value ? 'true' : 'false');
    }
  },

  /**
   * Retrieve boolean
   */
  async getBoolean(key: string): Promise<boolean | null> {
    if (mmkv) {
      const value = mmkv.getBoolean(key);
      return value ?? null;
    }
    const str = await guardedStorage.getItem(key);
    if (str === null) return null;
    return str === 'true';
  },
};

/**
 * Batch operations for efficiency
 */
export const batchStorage = {
  /**
   * Set multiple items at once from an object map, values are JSON-stringified
   */
  async setMultiple<T extends Record<string, any>>(values: T): Promise<void> {
    const entries: Array<[string, string]> = [];
    for (const [k, v] of Object.entries(values)) {
      try {
        entries.push([k, JSON.stringify(v)]);
      } catch (e) {
        console.warn(`Failed to stringify value for ${k}:`, e);
        throw e;
      }
    }
    await guardedStorage.multiSet(entries);
  },

  /**
   * Get multiple items and parse into an object with defaults
   */
  async getMultiple<T extends Record<string, any>>(keys: string[], defaultValues: T): Promise<T> {
    const pairs = await guardedStorage.multiGet(keys);
    const result: Record<string, any> = {};
    for (const [k, v] of pairs) {
      if (v == null) { result[k] = (defaultValues as any)[k]; continue; }
      try { result[k] = JSON.parse(v); } catch {
        result[k] = (defaultValues as any)[k];
      }
    }
    return result as T;
  },

  /**
   * Remove multiple items at once
   */
  async removeMultiple(keys: string[]): Promise<void> {
    await guardedStorage.multiRemove(keys);
  },
};

// Re-export for backward compatibility
export { guardedStorage as storage };
export default guardedStorage;
