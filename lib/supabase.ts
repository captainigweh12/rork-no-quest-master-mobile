import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';

const supabaseUrl = 'https://hotbmbscjxgayivmyenb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGJtYnNjanhnYXlpdm15ZW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjgyMDgsImV4cCI6MjA3NzAwNDIwOH0.8pU3MXu8ylwSORBzXMQqbQ6ZBKXh9tXWALiJo1A8E8M';



console.log('🔗 Initializing Supabase client...');
console.log('🔗 Supabase URL:', supabaseUrl);
console.log('🔑 Anon key present:', !!supabaseAnonKey);
console.log('📦 Platform:', Platform.OS);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

console.log('✅ Supabase client initialized');
