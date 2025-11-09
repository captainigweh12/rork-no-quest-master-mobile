/**
 * Storage Module
 * 
 * Production-ready storage with:
 * - MMKV for development builds (high-performance)
 * - AsyncStorage for Expo Go (compatibility)
 * - SecureStore for sensitive keys (tokens, credentials)
 * - Dynamic imports to prevent Expo Go crashes
 * - Type-safe interface with helpers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

type Key = string;

export interface StorageBackend {
  using: 'mmkv' | 'async';
  getItem(key: Key): Promise<string | null>;
  setItem(key: Key, value: string): Promise<void>;
  removeItem(key: Key): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
  multiGet(keys: Key[]): Promise<[Key, string | null][]>;
  multiSet(entries: [Key, string][]): Promise<void>;
  multiRemove(keys: Key[]): Promise<void>;
}

// ---- Config ---------------------------------------------------------------

// Route secrets to SecureStore at all times
const SECRET_KEYS = new Set([
  'auth:access_token',
  'auth:refresh_token',
  'videosdk:token',
  'supabase:session',
]);

const LOG = __DEV__; // Only log in development

function log(...args: any[]) {
  if (LOG) console.log('[Storage]', ...args);
}

// ---- Backend Management ---------------------------------------------------

let _backend: StorageBackend | null = null;
let _ready: Promise<StorageBackend> | null = null;

async function createMMKVBackend(): Promise<StorageBackend> {
  try {
    // Dynamic import so Expo Go doesn't crash
    log('Attempting MMKV initialization...');
  const { createMMKV } = await import('react-native-mmkv');
  const mmkv = createMMKV({ id: 'default-storage' });

    const removeKey = (k: string) => {
      const inst: any = mmkv as any;
      if (typeof inst.delete === 'function') inst.delete(k);
      else if (typeof inst.remove === 'function') inst.remove(k);
      else if (typeof inst.removeItem === 'function') inst.removeItem(k);
      else inst.set(k, ''); // fallback overwrite
    };

    const backend: StorageBackend = {
      using: 'mmkv',
      async getItem(key) { return mmkv.getString(key) ?? null; },
      async setItem(key, value) { mmkv.set(key, value); },
      async removeItem(key) { removeKey(key); },
      async getAllKeys() { return Array.from(mmkv.getAllKeys()); },
      async clear() { mmkv.clearAll(); },
      async multiGet(keys) {
        return keys.map((k) => [k, mmkv.getString(k) ?? null] as [Key, string | null]);
      },
      async multiSet(entries) { entries.forEach(([k, v]) => mmkv.set(k, v)); },
      async multiRemove(keys) { keys.forEach((k) => removeKey(k)); },
    };

    log('MMKV initialized successfully');
    return backend;
  } catch (e) {
    log('MMKV not available, falling back to AsyncStorage');
    log('This is expected in Expo Go');
    return createAsyncBackend();
  }
}

function createAsyncBackend(): StorageBackend {
  const backend: StorageBackend = {
    using: 'async',
    async getItem(key) { return AsyncStorage.getItem(key); },
    async setItem(key, value) { return AsyncStorage.setItem(key, value); },
    async removeItem(key) { return AsyncStorage.removeItem(key); },
    async getAllKeys() { 
      const keys = await AsyncStorage.getAllKeys();
      return Array.from(keys); 
    },
    async clear() { return AsyncStorage.clear(); },
    async multiGet(keys) { 
      const pairs = await AsyncStorage.multiGet(keys);
      return pairs.map(([k, v]) => [k, v] as [Key, string | null]);
    },
    async multiSet(entries) { return AsyncStorage.multiSet(entries); },
    async multiRemove(keys) { return AsyncStorage.multiRemove(keys); },
  };
  log('AsyncStorage initialized successfully');
  return backend;
}

// ---- Public init / access -------------------------------------------------

export function ready(): Promise<StorageBackend> {
  if (_backend) return Promise.resolve(_backend);
  if (_ready) return _ready;
  _ready = (async () => {
    const b = await createMMKVBackend();
    _backend = b;
    return b;
  })();
  return _ready;
}

// Route secrets to SecureStore (optional)
async function setSecureIfNeeded(key: Key, value?: string | null): Promise<boolean> {
  if (!SECRET_KEYS.has(key)) return false;
  try {
    if (value == null) { 
      await SecureStore.deleteItemAsync(key); 
      return true; 
    }
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (e) {
    log('SecureStore error, falling back to regular storage:', e);
    return false;
  }
}

async function getSecureIfNeeded(key: Key): Promise<string | null | undefined> {
  if (!SECRET_KEYS.has(key)) return undefined;
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    log('SecureStore read error, returning undefined:', e);
    return undefined;
  }
}

// ---- High-level API -------------------------------------------------------

export async function getItem(key: Key): Promise<string | null> {
  const secure = await getSecureIfNeeded(key);
  if (secure !== undefined) return secure;
  const b = await ready();
  return b.getItem(key);
}

export async function setItem(key: Key, value: string): Promise<void> {
  if (await setSecureIfNeeded(key, value)) return;
  const b = await ready();
  return b.setItem(key, value);
}

export async function removeItem(key: Key): Promise<void> {
  if (await setSecureIfNeeded(key, null)) return;
  const b = await ready();
  return b.removeItem(key);
}

export async function getAllKeys(): Promise<string[]> {
  const b = await ready();
  return b.getAllKeys();
}

export async function clear(): Promise<void> {
  // Clear secure keys explicitly
  await Promise.allSettled(
    Array.from(SECRET_KEYS).map((k) => SecureStore.deleteItemAsync(k))
  );
  const b = await ready();
  return b.clear();
}

export async function multiGet(keys: Key[]): Promise<[Key, string | null][]> {
  const b = await ready();
  const results: [Key, string | null][] = [];
  for (const k of keys) {
    const s = await getSecureIfNeeded(k);
    results.push([k, s !== undefined ? s : await b.getItem(k)]);
  }
  return results;
}

export async function multiSet(entries: [Key, string][]): Promise<void> {
  const secureTasks: Promise<any>[] = [];
  const normal: [Key, string][] = [];
  for (const [k, v] of entries) {
    if (SECRET_KEYS.has(k)) {
      secureTasks.push(SecureStore.setItemAsync(k, v).catch(() => {}));
    } else {
      normal.push([k, v]);
    }
  }
  const b = await ready();
  await Promise.all([b.multiSet(normal), ...secureTasks]);
}

export async function multiRemove(keys: Key[]): Promise<void> {
  const secureTasks: Promise<any>[] = [];
  const normal: Key[] = [];
  for (const k of keys) {
    if (SECRET_KEYS.has(k)) {
      secureTasks.push(SecureStore.deleteItemAsync(k).catch(() => {}));
    } else {
      normal.push(k);
    }
  }
  const b = await ready();
  await Promise.all([b.multiRemove(normal), ...secureTasks]);
}

// ---- Convenience typed helpers --------------------------------------------

export async function getJSON<T>(key: Key, fallback?: T): Promise<T | null> {
  const raw = await getItem(key);
  if (raw == null) return fallback ?? null;
  try { return JSON.parse(raw) as T; } catch { return fallback ?? null; }
}

export async function setJSON(key: Key, value: any): Promise<void> {
  return setItem(key, JSON.stringify(value));
}

export async function getBoolean(key: Key): Promise<boolean | null> {
  const v = await getItem(key);
  return v == null ? null : v === 'true' || v === '1';
}

export async function getNumber(key: Key): Promise<number | null> {
  const v = await getItem(key);
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Introspection (for debugging / analytics)
export async function using(): Promise<'mmkv' | 'async'> {
  const b = await ready();
  return b.using;
}

// ---- Backward Compatibility API (for existing code) ----------------------

export async function initAppStorage(): Promise<void> {
  await ready();
  log('Storage initialization complete');
}

export function isStorageReady(): boolean {
  return _backend !== null;
}

export function isStorageAvailable(): boolean {
  return _backend !== null;
}

export function resetStorage(): void {
  _backend =null;
  _ready = null;
}

export const guardedStorage = {
  getItem,
  setItem,
  removeItem,
  getAllKeys,
  clear,
  multiGet,
  multiSet,
  multiRemove,
};

export const typedStorage = {
  getJSON,
  setJSON,
};

export const batchStorage = {
  async getMultiple<T extends Record<string, any>>(keys: string[], defaultValues: T): Promise<T> {
    const result: Record<string, any> = {};
    const pairs = await multiGet(keys);
    pairs.forEach(([key, value]) => {
      if (value === null) {
        result[key] = defaultValues[key];
      } else {
        try {
          result[key] = JSON.parse(value);
        } catch (e) {
          log(`Error parsing JSON for ${key}:`, e);
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
        log(`Error stringifying JSON for ${key}:`, e);
        throw e;
      }
    }
    await multiSet(pairs);
  },
};
