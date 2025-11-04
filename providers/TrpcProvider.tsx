import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, getTrpcClient } from "@/lib/trpc";
import { View, Text, ActivityIndicator } from "react-native";

const queryClient = new QueryClient();

export default function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] =
    useState<ReturnType<typeof trpc.createClient> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log('[TrpcProvider] Initializing tRPC client...');
    getTrpcClient()
      .then((c) => {
        if (mounted) {
          console.log('[TrpcProvider] ✅ Client ready');
          setClient(c);
        }
      })
      .catch((err) => {
        console.error('[TrpcProvider] ❌ Failed to initialize:', err);
        if (mounted) {
          setError(err.message || 'Failed to initialize tRPC');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Failed to connect
        </Text>
        <Text style={{ color: '#666', fontSize: 14, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>
          Connecting to server...
        </Text>
      </View>
    );
  }

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
