import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type Extra = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

let supabaseUrl = extra.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = extra.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing from config, using hardcoded values for development');
  supabaseUrl = 'https://hotbmbscjxgayivmyenb.supabase.co';
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGJtYnNjanhnYXlpdm15ZW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjgyMDgsImV4cCI6MjA3NzAwNDIwOH0.8pU3MXu8ylwSORBzXMQqbQ6ZBKXh9tXWALiJo1A8E8M';
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase config check:', { 
    url: supabaseUrl, 
    keyPresent: !!supabaseAnonKey,
    extra: Constants.expoConfig?.extra,
    processEnv: {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
      keyPresent: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
  });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
