import Constants from "expo-constants";

type Extra = Partial<{
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}>;

export function getSupabaseEnv() {
  const urlFromEnv = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const keyFromEnv = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const extra = (Constants.expoConfig?.extra ??
                 Constants.manifest?.extra ??
                 {}) as Extra;

  const url = urlFromEnv || extra.SUPABASE_URL;
  const key = keyFromEnv || extra.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ Supabase env missing", {
      hasProcessUrl: !!urlFromEnv,
      hasProcessKey: !!keyFromEnv,
      extraKeys: Object.keys(extra || {}),
      extraUrl: !!extra.SUPABASE_URL,
      extraKey: !!extra.SUPABASE_ANON_KEY,
    });
    throw new Error(
      "Supabase env not found. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env"
    );
  }

  return { url, key };
}
