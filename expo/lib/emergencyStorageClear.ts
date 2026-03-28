import { guardedStorage } from './storage';

export async function emergencyStorageClear(): Promise<void> {
  try {
    await guardedStorage.clearAll?.();
  } catch {
    // ignore
  }
}

export default emergencyStorageClear;
