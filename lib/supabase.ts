import '@/lib/polyfills/reactUse.js';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { storage as appStorage } from '@/lib/storage';

// ✅ Reads variables from your .env (Expo public vars)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ✅ Safety checks and logs for debugging
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase environment variables.');
  console.log('🔍 EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('🔍 EXPO_PUBLIC_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // prevents web URL issues on mobile
    // Provide adapter matching AsyncStorage interface for Supabase auth persistence
    storage: {
      getItem: (key: string) => appStorage.getItem(key),
      setItem: (key: string, value: string) => appStorage.setItem(key, value),
      removeItem: (key: string) => appStorage.removeItem(key),
    } as any,
  },
});
