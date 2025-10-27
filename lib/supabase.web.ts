import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

const { url, key } = getSupabaseEnv();

console.log("🌐 Initializing Supabase web client...");
console.log("🔗 URL:", url);
console.log("🔑 Key present:", !!key);

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

console.log("✅ Supabase web client initialized");
