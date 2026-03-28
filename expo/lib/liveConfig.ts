/// <reference lib="es2015" />
import { guardedStorage, isStorageReady } from './storage';
import { setBaseUrlOverride, clearStaleUrlIfNeeded, DEFAULT_RENDER_BASE_URL } from './baseUrl';

const LIVE_CONFIG_KEY = 'LIVE_STREAM_CONFIGURED';
const LIVE_CONFIG_VERSION = 'v1';

export interface LiveStreamConfig {
  configured: boolean;
  configuredAt?: string;
  version: string;
}

/**
 * Check if live streaming has been configured
 */
export async function isLiveStreamConfigured(): Promise<boolean> {
  try {
    if (!isStorageReady()) {
      console.warn('[liveConfig] Storage not ready, returning false');
      return false;
    }
    
    const config = await guardedStorage.getItem(LIVE_CONFIG_KEY);
    if (!config) return false;
    
    try {
      const parsed: LiveStreamConfig = JSON.parse(config);
      return parsed.configured === true && parsed.version === LIVE_CONFIG_VERSION;
    } catch (parseError) {
      console.error('[liveConfig] Invalid JSON in storage, clearing corrupted data:', parseError);
      await guardedStorage.removeItem(LIVE_CONFIG_KEY);
      return false;
    }
  } catch (error) {
    console.error('[liveConfig] Error checking configuration:', error);
    return false;
  }
}

/**
 * Configure live streaming by setting the correct backend URL and clearing stale URLs
 */
export async function configureLiveStreaming(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[liveConfig] 🔧 Starting live streaming configuration...');
    
    if (!isStorageReady()) {
      throw new Error('Storage not ready');
    }
    
    // Step 1: Clear any stale URLs
    console.log('[liveConfig] 🧹 Checking for stale URLs...');
    try {
      const clearedStale = await clearStaleUrlIfNeeded();
      if (clearedStale) {
        console.log('[liveConfig] ✅ Cleared stale URLs');
      }
    } catch (err) {
      console.warn('[liveConfig] ⚠️ Could not clear stale URLs:', err);
    }
    
    // Step 2: Set the correct Render base URL
    console.log('[liveConfig] 🌐 Setting Render base URL:', DEFAULT_RENDER_BASE_URL);
    try {
      await setBaseUrlOverride(DEFAULT_RENDER_BASE_URL);
    } catch (err) {
      console.warn('[liveConfig] ⚠️ Could not set base URL override:', err);
    }
    
    // Step 3: Mark configuration as complete
    const config: LiveStreamConfig = {
      configured: true,
      configuredAt: new Date().toISOString(),
      version: LIVE_CONFIG_VERSION,
    };
    
    await guardedStorage.setItem(LIVE_CONFIG_KEY, JSON.stringify(config));
    console.log('[liveConfig] ✅ Live streaming configuration complete!');
    
    // Step 4: Trigger base URL re-initialization if available
    const reinit = (globalThis as any).__RORK_INIT_BASE_URL__ as (() => Promise<void>) | undefined;
    if (reinit) {
      console.log('[liveConfig] 🔄 Re-initializing base URL...');
      try {
        await reinit();
      } catch (err) {
        console.warn('[liveConfig] ⚠️ Could not re-initialize base URL:', err);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('[liveConfig] ❌ Error configuring live streaming:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Reset live streaming configuration (for testing or troubleshooting)
 */
export async function resetLiveStreamConfig(): Promise<void> {
  try {
    await guardedStorage.removeItem(LIVE_CONFIG_KEY);
    console.log('[liveConfig] 🔄 Live streaming configuration reset');
  } catch (error) {
    console.error('[liveConfig] Error resetting configuration:', error);
  }
}

/**
 * Get configuration details
 */
export async function getLiveStreamConfig(): Promise<LiveStreamConfig | null> {
  try {
    if (!isStorageReady()) {
      console.warn('[liveConfig] Storage not ready');
      return null;
    }
    
    const config = await guardedStorage.getItem(LIVE_CONFIG_KEY);
    if (!config) return null;
    
    try {
      return JSON.parse(config);
    } catch (parseError) {
      console.error('[liveConfig] Invalid JSON in storage, clearing corrupted data:', parseError);
      await guardedStorage.removeItem(LIVE_CONFIG_KEY);
      return null;
    }
  } catch (error) {
    console.error('[liveConfig] Error getting configuration:', error);
    return null;
  }
}
