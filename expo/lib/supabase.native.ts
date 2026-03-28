import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { storage as appStorage } from '@/lib/storage';
import { AppState } from "react-native";
import { getSupabaseEnv } from "./env";

const { url, key } = getSupabaseEnv();

console.log("📱 Initializing Supabase native client...");
console.log("🔗 URL:", url);
console.log("🔑 Key present:", !!key);

export const supabase = createClient(url, key, {
  auth: {
    storage: {
      getItem: (k: string) => appStorage.getItem(k),
      setItem: (k: string, v: string) => appStorage.setItem(k, v),
      removeItem: (k: string) => appStorage.removeItem(k),
    } as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "X-Client-Info": "supabase-js-react-native",
    },
  },
});

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

console.log("✅ Supabase native client initialized");
