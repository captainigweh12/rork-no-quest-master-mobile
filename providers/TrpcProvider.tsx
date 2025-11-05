import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { loadBaseUrlOverride, clearStaleUrlIfNeeded, getBaseUrl } from "@/lib/baseUrl";

// Configure query client with retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Provider component for tRPC setup
export default function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [trpcClient] = useState(() => createTrpcClient());
  const [isSettingUrl, setIsSettingUrl] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initBaseUrl() {
      try {
        setIsSettingUrl(true);
        setError(null);
        
        await clearStaleUrlIfNeeded();
        await loadBaseUrlOverride();
        
        console.log("[TrpcProvider] Initialized with URL:", getBaseUrl());
      } catch (e) {
        console.error("[TrpcProvider] Error initializing base URL:", e);
        setError(e instanceof Error ? e.message : "Unknown error initializing tRPC");
      } finally {
        setIsSettingUrl(false);
      }
    }

    initBaseUrl();
  }, []);

  if (isSettingUrl) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Initializing API connection...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "red", marginBottom: 20 }}>Error: {error}</Text>
        <Pressable
          onPress={() => window.location.reload()}
          style={{ padding: 10, backgroundColor: "#007AFF", borderRadius: 5 }}
        >
          <Text style={{ color: "white" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
