import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type KV = {
  getString(k: string): Promise<string | null> | string | null;
  set(k: string, v: string): Promise<void> | void;
  del(k: string): Promise<void> | void;
  clear(): Promise<void> | void;
  allKeys?(): Promise<readonly string[]>;
};

let Storage: KV;

try {
  const useMMKV = Platform.OS !== 'web' && !(globalThis as any).expoGo;
  if (!useMMKV) throw new Error('fallback');
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MMKV } = require('react-native-mmkv');
  const mmkv = new MMKV();
  Storage = {
    getString: (k) => mmkv.getString(k) ?? null,
    set: (k, v) => mmkv.set(k, v),
    del: (k) => mmkv.delete(k),
    clear: () => mmkv.clearAll(),
  };
  console.log('✅ Storage backend: MMKV');
} catch {
  Storage = {
    getString: (k) => AsyncStorage.getItem(k),
    set: (k, v) => AsyncStorage.setItem(k, v),
    del: (k) => AsyncStorage.removeItem(k),
    clear: () => AsyncStorage.clear(),
    allKeys: () => AsyncStorage.getAllKeys(),
  };
  console.log('✅ Storage backend: AsyncStorage');
}

export { Storage };
