import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

export const supabase = createClient(validUrl, validAnon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    headers: { apikey: validAnon },
  },
});
