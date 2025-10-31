import Constants from "expo-constants";

type Extra = Partial<{
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_API_KEY: string;
  PERPLEXITY_API_KEY: string;
  AI_PROVIDER_ORDER: string;
  YOUTUBE_API_KEY: string;
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

export type AIEnv = {
  openaiKey?: string;
  perplexityKey?: string;
  providerOrder: ("perplexity" | "openai")[];
};

export function getAIEnv(): AIEnv {
  const openaiFromEnv = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const perplexityFromEnv = process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY;
  const orderFromEnv = process.env.EXPO_PUBLIC_AI_PROVIDER_ORDER;

  const extra = (Constants.expoConfig?.extra ??
                 Constants.manifest?.extra ??
                 {}) as Extra;

  const openaiKey = openaiFromEnv || extra.OPENAI_API_KEY;
  const perplexityKey = perplexityFromEnv || extra.PERPLEXITY_API_KEY;

  const providerOrder = (orderFromEnv || extra.AI_PROVIDER_ORDER || "perplexity,openai")
    .split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter((s: string): s is "perplexity" | "openai" => s === "perplexity" || s === "openai");

  return {
    openaiKey: openaiKey || undefined,
    perplexityKey: perplexityKey || undefined,
    providerOrder: providerOrder.length > 0 ? providerOrder : ["perplexity", "openai"],
  };
}

export function getYouTubeApiKey(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {}) as Extra;
  const key = fromEnv || extra.YOUTUBE_API_KEY;
  return key || undefined;
}
