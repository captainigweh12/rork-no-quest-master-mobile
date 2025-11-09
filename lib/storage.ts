import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Store = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clearAll(): Promise<void>;
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

const isExpoGo = () => Constants?.appOwnership === 'expo';

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

    if (isExpoGo()) {
      const secureGet = async (k: string) =>
        (await SecureStore?.getItemAsync?.(k)) ?? null;
      const secureSet = async (k: string, v: string) =>
        void (await SecureStore?.setItemAsync?.(k, v));
      const secureDel = async (k: string) =>
        void (await SecureStore?.deleteItemAsync?.(k));

      impl = {
        async getItem(k) {
          return SECRET_KEYS.has(k) ? secureGet(k) : AsyncStorage.getItem(k);
        },
        async setItem(k, v) {
          return SECRET_KEYS.has(k) ? secureSet(k, v) : AsyncStorage.setItem(k, v);
        },
        async removeItem(k) {
          return SECRET_KEYS.has(k) ? secureDel(k) : AsyncStorage.removeItem(k);
        },
        async getAllKeys() {
          return [...(await AsyncStorage.getAllKeys())];
        },
        async clearAll() {
          await AsyncStorage.clear();
        },
      };
      console.log('📱 Storage backend: AsyncStorage + SecureStore (Expo Go)');
      return;
    }

    try {
      const mod = await import('react-native-mmkv');
      const { MMKV } = mod as any;
      const mmkv = new MMKV();

      const secureGet = async (k: string) =>
        (await SecureStore?.getItemAsync?.(k)) ?? null;
      const secureSet = async (k: string, v: string) =>
        void (await SecureStore?.setItemAsync?.(k, v));
      const secureDel = async (k: string) =>
        void (await SecureStore?.deleteItemAsync?.(k));

      impl = {
        async getItem(k) {
          if (SECRET_KEYS.has(k)) return secureGet(k);
          return mmkv.getString(k) ?? null;
        },
        async setItem(k, v) {
          if (SECRET_KEYS.has(k)) return secureSet(k, v);
          mmkv.set(k, v);
        },
        async removeItem(k) {
          if (SECRET_KEYS.has(k)) return secureDel(k);
          mmkv.delete(k);
        },
        async getAllKeys() {
          return mmkv.getAllKeys() as string[];
        },
        async clearAll() {
          mmkv.clearAll();
        },
      };
      console.log('✅ Storage backend: MMKV + SecureStore (high-performance)');
    } catch {
      impl = {
        async getItem(k) {
          return SECRET_KEYS.has(k)
            ? (await SecureStore?.getItemAsync?.(k)) ?? null
            : AsyncStorage.getItem(k);
        },
        async setItem(k, v) {
          return SECRET_KEYS.has(k)
            ? void (await SecureStore?.setItemAsync?.(k, v))
            : AsyncStorage.setItem(k, v);
        },
        async removeItem(k) {
          return SECRET_KEYS.has(k)
            ? void (await SecureStore?.deleteItemAsync?.(k))
            : AsyncStorage.removeItem(k);
        },
        async getAllKeys() {
          return [...(await AsyncStorage.getAllKeys())];
        },
        async clearAll() {
          await AsyncStorage.clear();
        },
      };
      console.log('⚠️ Storage backend: AsyncStorage + SecureStore (MMKV unavailable)');
    }
  })();

  await initPromise;
  initPromise = null;
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

export async function getJSON<T = unknown>(key: string): Promise<T | null> {
  const raw = await getItem(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown) {
  return setItem(key, JSON.stringify(value));
}

export const guardedStorage = {
  getItem,
  setItem,
  removeItem,
  getAllKeys,
  clearAll,
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
