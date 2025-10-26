import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anon || url.includes('YOUR-PROJECT') || anon.includes('YOUR_')) {
  console.error('[supabase] ⚠️ CRITICAL: Missing or invalid Supabase credentials!');
  console.error('[supabase] Please update your .env file with actual values:');
  console.error('[supabase] EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('[supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  console.error('[supabase] Current URL:', url || 'MISSING');
  console.error('[supabase] Current Key:', anon ? '(set but invalid)' : 'MISSING');
}

const validUrl = url && !url.includes('YOUR-PROJECT') ? url : 'https://placeholder.supabase.co';
const validAnon = anon && !anon.includes('YOUR_') ? anon : 'placeholder-key';

class CustomStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('[supabase] Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('[supabase] Storage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('[supabase] Storage removeItem error:', error);
    }
  }
}

const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  console.log('[supabase] Fetch request to:', url);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
      },
    });
    console.log('[supabase] Fetch response status:', response.status);
    return response;
  } catch (error) {
    console.error('[supabase] Fetch error:', error);
    throw error;
  }
};

export const supabase = createClient(validUrl, validAnon, {
  auth: {
    storage: new CustomStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
  global: {
    headers: {
      apikey: validAnon,
    },
    fetch: customFetch,
  },
});
