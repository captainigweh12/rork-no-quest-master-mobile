/**
 * Storage Module
 * 
 * Now using SQLite for faster, more reliable storage.
 * Maintains backward compatibility with AsyncStorage interface.
 */

export {
  initAppStorage,
  enableStorageAccess,
  disableStorageAccess,
  isStorageReady,
  isStorageAvailable,
  guardedStorage,
  devMode,
  safeJSON,
  typedStorage,
  batchStorage,
} from './sqliteStorage';
