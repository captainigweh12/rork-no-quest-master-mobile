import { useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { View, Text, ActivityIndicator, Pressable, Platform } from "react-native";
import { loadBaseUrlOverride, clearStaleUrlIfNeeded, getBaseUrl, setBaseUrlOverride, DEFAULT_RENDER_BASE_URL } from "@/lib/baseUrl";
import { configureLiveStreaming, isLiveStreamConfigured } from "@/lib/liveConfig";
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
        
        // Step 1: Clear stale URLs
        console.log('[TrpcProvider] 🧹 Checking for stale URLs...');
        await clearStaleUrlIfNeeded();
        
        // Step 2: Ensure correct base URL is set
        const persisted = await loadBaseUrlOverride();
        const desired = DEFAULT_RENDER_BASE_URL;

        if (persisted !== desired) {
          console.log('[TrpcProvider] 🌐 Forcing base URL override to Render:', desired);
          await setBaseUrlOverride(desired);
        }

        // Step 3: Auto-configure live streaming if not already configured
        const liveConfigured = await isLiveStreamConfigured();
        if (!liveConfigured) {
          console.log('[TrpcProvider] 🎥 Auto-configuring live streaming...');
          const result = await configureLiveStreaming();
          if (result.success) {
            console.log('[TrpcProvider] ✅ Live streaming auto-configured successfully');
          } else {
            console.warn('[TrpcProvider] ⚠️ Live streaming auto-configuration failed:', result.error);
            // Don't fail the entire initialization - user can configure manually later
          }
        } else {
          console.log('[TrpcProvider] ✅ Live streaming already configured');
        }

        const url = getBaseUrl();
        console.log('[TrpcProvider] 🚀 Initialized with URL:', url);
        if (mounted) setReadyBaseUrl(url);
      } catch (e) {
        console.error('[TrpcProvider] ❌ Error initializing base URL:', e);
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
    console.log("[TrpcProvider] 🔧 Creating tRPC client for:", `${readyBaseUrl}/api/trpc`);
    return createTrpcClient({ baseUrl: readyBaseUrl });
  }, [readyBaseUrl]);

  // Prefetch VideoSDK token after client is ready for smoother streaming experience
  useEffect(() => {
    if (!trpcClient) return;
    
    const prefetchToken = async () => {
      try {
        console.log('[TrpcProvider] 🎬 Prefetching VideoSDK token...');
        // Using queryClient to prefetch - this will cache the token
        await queryClient.prefetchQuery({
          queryKey: ['videosdk', 'getToken'],
          queryFn: async () => {
            const client = createTrpcClient({ baseUrl: readyBaseUrl! });
            return await client.videosdk.getToken.query();
          },
          staleTime: 1000 * 60 * 60, // 1 hour - same as VideoSDK context
        });
        console.log('[TrpcProvider] ✅ VideoSDK token prefetched successfully');
      } catch (error) {
        // Don't fail app startup if token prefetch fails
        // User will get it when they actually try to stream
        console.warn('[TrpcProvider] ⚠️ VideoSDK token prefetch failed (non-critical):', error);
      }
    };

    // Prefetch after a short delay to not block initial render
    const timeoutId = setTimeout(prefetchToken, 1000);
    return () => clearTimeout(timeoutId);
  }, [trpcClient, readyBaseUrl]);

  if (isSettingUrl || !trpcClient) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 10, color: "#fff", fontSize: 16 }}>Initializing...</Text>
        <Text style={{ marginTop: 4, color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
          Setting up live streaming
        </Text>
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
