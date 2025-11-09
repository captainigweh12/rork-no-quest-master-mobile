/**
 * Storage Module
 * 
 * Now using MMKV for high-performance, reliable storage.
 * Much faster than AsyncStorage and SQLite for key-value operations.
 * Maintains backward compatibility with AsyncStorage interface.
 */

export {
  initAppStorage,
  isStorageReady,
  isStorageAvailable,
  guardedStorage,
  typedStorage,
  batchStorage,
} from './mmkvStorage';
