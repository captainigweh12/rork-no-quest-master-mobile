/**
 * App Initialization Hook
 * 
 * Coordinates app startup sequence:
 * 1. Initialize storage
 * 2. Load environment variables
 * 3. Set up base URL
 * 4. Signal ready state to providers
 */

import { useState, useEffect } from 'react';
import { emergencyClearCorruptedStorage } from '@/lib/emergencyStorageClear';
import { initAppStorage, isStorageReady, isStorageAvailable } from '@/lib/storage';
import { getBaseUrl } from '@/lib/baseUrl';

export interface AppInitState {
  isInitializing: boolean;
  isReady: boolean;
  storageAvailable: boolean;
  error: Error | null;
}

/**
 * Hook to manage app initialization sequence
 */
export function useAppInit() {
  const [state, setState] = useState<AppInitState>({
    isInitializing: true,
    isReady: false,
    storageAvailable: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        console.log('[APP_INIT] Starting initialization sequence...');

        // Step 0: Emergency clear of corrupted storage (MUST run first)
        console.log('[APP_INIT] Step 0: Emergency clearing corrupted storage...');
        try {
          await emergencyClearCorruptedStorage();
          console.log('[APP_INIT] Emergency clear complete ✓');
        } catch (clearError) {
          console.error('[APP_INIT] Emergency clear failed (continuing anyway):', clearError);
        }

        // Step 1: Initialize storage system
        console.log('[APP_INIT] Step 1: Initializing storage...');
        await initAppStorage();
        
        if (!mounted) return;
        
        // Verify storage is ready
        if (!isStorageReady()) {
          throw new Error('Storage initialization failed');
        }
        console.log('[APP_INIT] Storage ready ✓');

        // Step 2: Load environment configuration
        console.log('[APP_INIT] Step 2: Loading environment...');
        // This happens automatically via .env files
        console.log('[APP_INIT] Environment loaded ✓');

        // Step 3: Load base URL override from storage
        console.log('[APP_INIT] Step 3: Loading base URL from storage...');
        const { loadBaseUrlOverride, getBaseUrl } = await import('@/lib/baseUrl');
        await loadBaseUrlOverride();
        const baseUrl = getBaseUrl();
        console.log('[APP_INIT] Base URL ready:', baseUrl, '✓');

        if (!mounted) return;

        // All initialization complete
        const available = isStorageAvailable();
        if (!available) {
          console.warn('[APP_INIT] ⚠️ Storage unavailable - running in memory-only mode');
        }
        console.log('[APP_INIT] ✅ Initialization complete - app ready');
        setState({
          isInitializing: false,
          isReady: true,
          storageAvailable: available,
          error: null,
        });
      } catch (error) {
        console.error('[APP_INIT] ❌ Initialization failed:', error);
        
        if (!mounted) return;
        
        setState({
          isInitializing: false,
          isReady: true, // Still mark as ready to prevent app hang
          storageAvailable: isStorageAvailable(),
          error: error as Error,
        });
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

/**
 * Hook to check if storage is ready for use
 * Simpler version that just checks storage state
 */
export function useStorageReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initAppStorage().then(() => {
      setReady(isStorageReady());
    });
  }, []);

  return ready;
}
