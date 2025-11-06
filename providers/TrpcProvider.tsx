import { useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { View, Text, ActivityIndicator, Pressable, Platform } from "react-native";
import { loadBaseUrlOverride, clearStaleUrlIfNeeded, getBaseUrl, setBaseUrlOverride, DEFAULT_RENDER_BASE_URL } from "@/lib/baseUrl";
import React from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export default function TrpcProvider({ children }: { children: ReactNode }) {
  const [isSettingUrl, setIsSettingUrl] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [readyBaseUrl, setReadyBaseUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function initBaseUrl() {
      try {
        setIsSettingUrl(true);
        setError(null);
        await clearStaleUrlIfNeeded();
        const persisted = await loadBaseUrlOverride();
        const desired = DEFAULT_RENDER_BASE_URL;

        if (persisted !== desired) {
          console.log('[TrpcProvider] Forcing base URL override to Render:', desired);
          await setBaseUrlOverride(desired);
        }

        const url = getBaseUrl();
        console.log('[TrpcProvider] Initialized with URL:', url);
        if (mounted) setReadyBaseUrl(url);
      } catch (e) {
        console.error('[TrpcProvider] Error initializing base URL:', e);
        setError(e instanceof Error ? e.message : 'Unknown error initializing tRPC');
      } finally {
        setIsSettingUrl(false);
      }
    }
    initBaseUrl();
    (globalThis as any).__RORK_INIT_BASE_URL__ = initBaseUrl;
    return () => {
      mounted = false;
      (globalThis as any).__RORK_INIT_BASE_URL__ = undefined;
    };
  }, []);

  const trpcClient = useMemo(() => {
    if (!readyBaseUrl) return null;
    console.log("[TrpcProvider] Creating tRPC client for:", `${readyBaseUrl}/api/trpc`);
    return createTrpcClient({ baseUrl: readyBaseUrl });
  }, [readyBaseUrl]);

  if (isSettingUrl || !trpcClient) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Initializing API connection...</Text>
      </View>
    );
  }

  if (error) {
    const onRetry = () => {
      if (Platform.OS === "web") {
        (window as any).location?.reload?.();
      } else {
        const reinit = (globalThis as any).__RORK_INIT_BASE_URL__ as (() => Promise<void>) | undefined;
        if (reinit) reinit();
      }
    };

    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "red", marginBottom: 20 }}>Error: {error}</Text>
        <Pressable
          onPress={onRetry}
          style={{ padding: 10, backgroundColor: "#007AFF", borderRadius: 5 }}
        >
          <Text style={{ color: "white" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
