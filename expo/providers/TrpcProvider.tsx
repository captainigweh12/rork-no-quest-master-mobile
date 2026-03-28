import { useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { View, Text, ActivityIndicator, Pressable, Platform } from "react-native";
import { loadBaseUrlOverride, clearStaleUrlIfNeeded, getBaseUrl, setBaseUrlOverride, DEFAULT_RENDER_BASE_URL } from "@/lib/baseUrl";
import React from "react";

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
        
        // Add delay to ensure AsyncStorage is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Step 1: Clear stale URLs
        console.log('[TrpcProvider] 🧹 Checking for stale URLs...');
        try {
          await clearStaleUrlIfNeeded();
        } catch (err) {
          console.warn('[TrpcProvider] ⚠️ Could not clear stale URLs (non-critical):', err);
        }
        
        // Step 2: Ensure correct base URL is set
        let persisted: string | undefined;
        try {
          persisted = await loadBaseUrlOverride();
        } catch (err) {
          console.warn('[TrpcProvider] ⚠️ Could not load base URL override:', err);
          persisted = undefined;
        }
        
        const desired = DEFAULT_RENDER_BASE_URL;

        if (persisted !== desired) {
          console.log('[TrpcProvider] 🌐 Forcing base URL override to Render:', desired);
          try {
            await setBaseUrlOverride(desired);
          } catch (err) {
            console.warn('[TrpcProvider] ⚠️ Could not set base URL override:', err);
          }
        }

        // Note: Live streaming configuration moved to lazy initialization
        // It now happens when the user actually tries to use streaming features
        // This prevents blocking app startup

        const url = getBaseUrl();
        console.log('[TrpcProvider] 🚀 Initialized with URL:', url);
        if (mounted) setReadyBaseUrl(url);
      } catch (e) {
        console.error('[TrpcProvider] ❌ Error initializing base URL:', e);
        // Instead of failing, use default URL
        console.log('[TrpcProvider] 🔄 Falling back to default URL...');
        if (mounted) {
          setReadyBaseUrl(DEFAULT_RENDER_BASE_URL);
        }
      } finally {
        if (mounted) {
          setIsSettingUrl(false);
        }
      }
    }
    initBaseUrl();
    (globalThis as any).__RORK_INIT_BASE_URL__ = initBaseUrl;
    return () => {
      mounted = false;
      (globalThis as any).__RORK_INIT_BASE_URL__ = undefined;
    };
  }, []);

  // Create a new QueryClient whenever base URL changes to prevent cache pollution
  const queryClient = useMemo(() => {
    if (!readyBaseUrl) return null;
    console.log("[TrpcProvider] 🔄 Creating new QueryClient for base URL:", readyBaseUrl);
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: 2,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
      },
    });
  }, [readyBaseUrl]);

  const trpcClient = useMemo(() => {
    if (!readyBaseUrl) return null;
    console.log("[TrpcProvider] 🔧 Creating tRPC client for:", `${readyBaseUrl}/api/trpc`);
    return createTrpcClient({ baseUrl: readyBaseUrl });
  }, [readyBaseUrl]);
  
  // Use base URL as key to force provider remount on URL change
  const providerKey = readyBaseUrl ? `trpc-${readyBaseUrl}` : 'trpc-loading';

  // Prefetch VideoSDK token after client is ready for smoother streaming experience
  useEffect(() => {
    if (!trpcClient || !queryClient) return;
    
    const prefetchToken = async () => {
      try {
        console.log('[TrpcProvider] 🎬 Prefetching VideoSDK token...');
        // Using queryClient to prefetch - this will cache the token
        await queryClient!.prefetchQuery({
          queryKey: ['videosdk', 'getToken', readyBaseUrl],
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
  }, [trpcClient, queryClient, readyBaseUrl]);

  if (isSettingUrl || !trpcClient) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 10, color: "#fff", fontSize: 16 }}>Initializing app...</Text>
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

  // Key forces complete provider remount when base URL changes, clearing all caches
  return (
    <QueryClientProvider client={queryClient!} key={providerKey}>
      <trpc.Provider client={trpcClient} queryClient={queryClient!}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}
