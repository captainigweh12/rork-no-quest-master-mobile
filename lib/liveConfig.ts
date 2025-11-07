/// <reference lib="es2015" />
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const config = await AsyncStorage.getItem(LIVE_CONFIG_KEY);
    if (!config) return false;
    
    const parsed: LiveStreamConfig = JSON.parse(config);
    return parsed.configured === true && parsed.version === LIVE_CONFIG_VERSION;
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
    
    // Step 1: Clear any stale URLs
    console.log('[liveConfig] 🧹 Checking for stale URLs...');
    const clearedStale = await clearStaleUrlIfNeeded();
    if (clearedStale) {
      console.log('[liveConfig] ✅ Cleared stale URLs');
    }
    
    // Step 2: Set the correct Render base URL
    console.log('[liveConfig] 🌐 Setting Render base URL:', DEFAULT_RENDER_BASE_URL);
    await setBaseUrlOverride(DEFAULT_RENDER_BASE_URL);
    
    // Step 3: Mark configuration as complete
    const config: LiveStreamConfig = {
      configured: true,
      configuredAt: new Date().toISOString(),
      version: LIVE_CONFIG_VERSION,
    };
    
    await AsyncStorage.setItem(LIVE_CONFIG_KEY, JSON.stringify(config));
    console.log('[liveConfig] ✅ Live streaming configuration complete!');
    
    // Step 4: Trigger base URL re-initialization if available
    const reinit = (globalThis as any).__RORK_INIT_BASE_URL__ as (() => Promise<void>) | undefined;
    if (reinit) {
      console.log('[liveConfig] 🔄 Re-initializing base URL...');
      await reinit();
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
    await AsyncStorage.removeItem(LIVE_CONFIG_KEY);
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
    const config = await AsyncStorage.getItem(LIVE_CONFIG_KEY);
    if (!config) return null;
    return JSON.parse(config);
  } catch (error) {
    console.error('[liveConfig] Error getting configuration:', error);
    return null;
  }
}
