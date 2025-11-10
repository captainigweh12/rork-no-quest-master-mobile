import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory emergency fallback (extremely rare path: if AsyncStorage itself consistently fails).
// Helps prevent cascading null reads if the underlying native module is temporarily unavailable.
const memoryFallback = new Map<string, string>();

type Store = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clearAll(): Promise<void>;
  multiGet?(keys: string[]): Promise<[string, string | null][]>;
  multiSet?(pairs: [string, string][]): Promise<void>;
  multiRemove?(keys: string[]): Promise<void>;
};

const SECRET_KEYS = new Set<string>([
  'auth:access_token',
  'auth:refresh_token',
  'videosdk:token',
  'supabase:session',
  'user:auth',
]);

let impl: Store | null = null;
let initPromise: Promise<void> | null = null;
let _isReady = false;

export const isStorageReady = () => _isReady;
export const isStorageAvailable = () => Platform.OS !== 'web' || typeof window !== 'undefined';

const isExpoGoOrGuest = () => Constants?.appOwnership === 'expo' || Constants?.appOwnership === 'guest';

async function ensureInitialized(): Promise<void> {
  if (impl) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let SecureStore: typeof import('expo-secure-store') | null = null;
    try {
      SecureStore = await import('expo-secure-store');
    } catch {
      SecureStore = null;
    }

    const secureGet = async (k: string) =>
      (await SecureStore?.getItemAsync?.(k)) ?? null;
    const secureSet = async (k: string, v: string) =>
      void (await SecureStore?.setItemAsync?.(k, v));
    const secureDel = async (k: string) =>
      void (await SecureStore?.deleteItemAsync?.(k));

    const buildAsyncBackend = (): Store => {
      const base: Store = {
        async getItem(k) {
          if (SECRET_KEYS.has(k)) return secureGet(k);
          try { return await AsyncStorage.getItem(k); } catch (e) { return memoryFallback.get(k) ?? null; }
        },
        async setItem(k, v) {
          if (SECRET_KEYS.has(k)) return secureSet(k, v);
          try { await AsyncStorage.setItem(k, v); } catch (e) { memoryFallback.set(k, v); }
        },
        async removeItem(k) {
          if (SECRET_KEYS.has(k)) return secureDel(k);
          try { await AsyncStorage.removeItem(k); } catch (e) { memoryFallback.delete(k); }
        },
        async getAllKeys() {
          try { return [...(await AsyncStorage.getAllKeys())]; } catch { return Array.from(new Set([...memoryFallback.keys()])); }
        },
        async clearAll() {
          try { await AsyncStorage.clear(); } catch { memoryFallback.clear(); }
        },
      };
      base.multiGet = async (keys) => Promise.all(keys.map(async (k) => [k, await base.getItem(k)] as [string, string | null]));
      base.multiSet = async (pairs) => { await Promise.all(pairs.map(([k, v]) => base.setItem(k, v))); };
      base.multiRemove = async (keys) => { await Promise.all(keys.map((k) => base.removeItem(k))); };
      return base;
    };

    // --- Expo Go or guest dev client ---
    if (isExpoGoOrGuest()) {
      impl = buildAsyncBackend();
      console.log('📱 Storage backend: AsyncStorage + SecureStore (Expo Go/Guest)');
      _isReady = true;
      return;
    }

    // --- Web builds: never import MMKV ---
    if (Platform.OS === 'web') {
      impl = buildAsyncBackend();
      console.log('🌐 Storage backend: AsyncStorage + SecureStore (Web)');
      _isReady = true;
      return;
    }

    const forceAsync = process.env.FORCE_ASYNC_STORAGE === 'true' || (Constants?.expoConfig?.extra as any)?.forceAsyncStorage === true;
    if (!forceAsync) {
      try {
        const mod = await import('react-native-mmkv');
        const { MMKV } = mod as any;
        const mmkv = new MMKV({ id: 'app-storage' });

        const base: Store = {
          async getItem(k) { return SECRET_KEYS.has(k) ? secureGet(k) : (mmkv.getString(k) ?? null); },
          async setItem(k, v) { if (SECRET_KEYS.has(k)) return secureSet(k, v); mmkv.set(k, v); },
          async removeItem(k) { if (SECRET_KEYS.has(k)) return secureDel(k); mmkv.delete(k); },
          async getAllKeys() { return mmkv.getAllKeys() as string[]; },
          async clearAll() { mmkv.clearAll(); },
        };
        base.multiGet = async (keys) => keys.map((k) => [k, mmkv.getString(k) ?? null] as [string, string | null]);
        base.multiSet = async (pairs) => { for (const [k, v] of pairs) mmkv.set(k, v); };
        base.multiRemove = async (keys) => { for (const k of keys) mmkv.delete(k); };
        impl = base;
        console.log('✅ Storage backend: MMKV + SecureStore (Native)');
      } catch {
        impl = buildAsyncBackend();
        console.log('⚠️ Storage backend: AsyncStorage + SecureStore (MMKV unavailable)');
      }
    } else {
      impl = buildAsyncBackend();
      console.log('🚫 FORCE_ASYNC_STORAGE active: Skipping MMKV import, using AsyncStorage backend');
    }
    _isReady = true;
  })();

  await initPromise;
  initPromise = null;
}

export async function initAppStorage() {
  await ensureInitialized();
  return true;
}

export async function getItem(key: string) {
  await ensureInitialized();
  return impl!.getItem(key);
}

export async function setItem(key: string, value: string) {
  await ensureInitialized();
  return impl!.setItem(key, value);
}

export async function removeItem(key: string) {
  await ensureInitialized();
  return impl!.removeItem(key);
}

export async function getAllKeys() {
  await ensureInitialized();
  return impl!.getAllKeys();
}

export async function clearAll() {
  await ensureInitialized();
  return impl!.clearAll();
}

export async function getJSON<T = unknown>(key: string, defaultValue?: T): Promise<T | null> {
  const raw = await getItem(key);
  if (raw == null) return defaultValue ?? null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue ?? null;
  }
}

export async function setJSON(key: string, value: unknown) {
  return setItem(key, JSON.stringify(value));
}

export const batchStorage = {
  async multiGet(keys: string[]) { await ensureInitialized(); return impl!.multiGet!(keys); },
  async multiSet(pairs: [string, string][]) { await ensureInitialized(); return impl!.multiSet!(pairs); },
  async multiRemove(keys: string[]) { await ensureInitialized(); return impl!.multiRemove!(keys); },

  // Convenience: accept an object map and JSON-stringify values
  async setMultiple<T extends Record<string, any>>(values: T): Promise<void> {
    const entries: [string, string][] = [];
    for (const [k, v] of Object.entries(values)) {
      try { entries.push([k, JSON.stringify(v)]); } catch (e) { console.warn(`Failed to stringify ${k}`, e); throw e; }
    }
    return this.multiSet(entries);
  },

  // Convenience: return parsed object with defaults
  async getMultiple<T extends Record<string, any>>(keys: string[], defaults: T): Promise<T> {
    const pairs = await this.multiGet(keys);
    const out: Record<string, any> = {};
    for (const [k, v] of pairs) {
      if (v == null) { out[k] = (defaults as any)[k]; continue; }
      try { out[k] = JSON.parse(v); } catch { out[k] = (defaults as any)[k]; }
    }
    return out as T;
  },
};

export const guardedStorage = {
  getItem,
  setItem,
  removeItem,
  getAllKeys,
  clearAll,
  async multiGet(keys: string[]) { return batchStorage.multiGet(keys); },
  async multiRemove(keys: string[]) { return batchStorage.multiRemove(keys); },
};

export const typedStorage = {
  getJSON,
  setJSON,
  async setNumber(key: string, value: number) {
    return setItem(key, value.toString());
  },
  async getNumber(key: string): Promise<number | null> {
    const str = await getItem(key);
    if (!str) return null;
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  },
  async setBoolean(key: string, value: boolean) {
    return setItem(key, value ? 'true' : 'false');
  },
  async getBoolean(key: string): Promise<boolean | null> {
    const str = await getItem(key);
    if (str === null) return null;
    return str === 'true';
  },
};

export { guardedStorage as storage };
export default guardedStorage;
