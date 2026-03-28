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
import { Platform } from 'react-native';
import emergencyStorageClear from '@/lib/emergencyStorageClear';
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
      // MEGA TRY-CATCH: Prevent any initialization error from crashing
      try {
        console.log('[APP_INIT] Starting initialization sequence...');

        // Step 0: Emergency clear of corrupted storage FIRST
        console.log('[APP_INIT] Step 0: Running emergency storage clear...');
        try {
          await emergencyStorageClear();
          console.log('[APP_INIT] Emergency clear completed ✓');
        } catch (clearError: any) {
          // Even if emergency clear fails, continue - we wrap everything in try-catch
          console.warn('[APP_INIT] Emergency clear had errors (continuing anyway):', clearError?.message || String(clearError));
        }

        // Step 1: Initialize storage system (with error protection)
        console.log('[APP_INIT] Step 1: Initializing storage...');
        try {
          await initAppStorage();
          
          if (!mounted) return;
          
          // Verify storage is ready
          if (!isStorageReady()) {
            console.warn('[APP_INIT] ⚠️ Storage not ready - continuing anyway');
          } else {
            console.log('[APP_INIT] Storage ready ✓');
          }
        } catch (storageError: any) {
          // Don't let storage errors crash the app
          console.error('[APP_INIT] Storage init failed (continuing anyway):', storageError?.message || String(storageError));
        }

        // Step 2: Load environment configuration
        console.log('[APP_INIT] Step 2: Loading environment...');
        // This happens automatically via .env files
        console.log('[APP_INIT] Environment loaded ✓');

        // Step 3: Load base URL override from storage (with error protection)
        console.log('[APP_INIT] Step 3: Loading base URL from storage...');
        try {
          const { loadBaseUrlOverride, getBaseUrl } = await import('@/lib/baseUrl');
          await loadBaseUrlOverride();
          const baseUrl = getBaseUrl();
          console.log('[APP_INIT] Base URL ready:', baseUrl, '✓');
        } catch (baseUrlError: any) {
          // Don't let base URL errors crash the app
          console.error('[APP_INIT] Base URL load failed (using defaults):', baseUrlError?.message || String(baseUrlError));
        }

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
      } 
      catch (error: any) {
        // MEGA CATCH: Handle any remaining errors gracefully
        const errMsg = error?.message || String(error);
        console.error('[APP_INIT] ❌ Initialization had errors:', errMsg);
        
        // Platform-specific error logging
        if (Platform.OS !== 'web') {
          console.error('[APP_INIT] Native platform error details:');
          console.error('- OS:', Platform.OS);
          console.error('- Version:', Platform.Version);
          console.error('- Error type:', error?.constructor?.name || 'Unknown');
          if (error?.code) console.error('- Error code:', error.code);
          if (error?.message) console.error('- Message:', error.message);
        }

        // Special handling for SyntaxError
        if (errMsg.includes('SyntaxError') || errMsg.includes("';' expected")) {
          console.error('[APP_INIT] 🚨 SyntaxError detected - storage corruption');
          console.error('[APP_INIT] Attempting additional emergency clear...');
          try {
            await emergencyStorageClear();
            console.log('[APP_INIT] ✅ Additional clear completed');
          } catch (secondError: any) {
            console.error('[APP_INIT] Additional clear failed:', secondError?.message || String(secondError));
          }
        }
        
        if (!mounted) return;
        
        // ALWAYS mark as ready - don't let errors hang the app
        setState({
          isInitializing: false,
          isReady: true,
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
