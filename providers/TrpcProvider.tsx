import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, getTrpcClient } from "@/lib/trpc";
import { View, Text, ActivityIndicator, Pressable } from "react-native";

const queryClient = new QueryClient();

export default function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] =
    useState<ReturnType<typeof trpc.createClient> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log('[TrpcProvider] Initializing tRPC client...');
    
    const timeout = setTimeout(() => {
      if (mounted && !client) {
        console.error('[TrpcProvider] ❌ Initialization timeout after 10s');
        setError('Connection timeout. The backend may be starting up or unreachable.');
      }
    }, 10000); // Increased to 10s for Render cold starts
    
    getTrpcClient()
      .then((c) => {
        clearTimeout(timeout);
        if (mounted) {
          console.log('[TrpcProvider] ✅ Client ready');
          setClient(c);
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error('[TrpcProvider] ❌ Failed to initialize:', err);
        if (mounted) {
          // Provide more helpful error messages
          let errorMsg = err.message || 'Failed to initialize tRPC';
          
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Network request failed')) {
            errorMsg = 'Network error. Please check your internet connection and ensure the backend is running.';
          } else if (errorMsg.includes('JSON')) {
            errorMsg = 'Server returned invalid response. The backend may be misconfigured.';
          }
          
          setError(errorMsg);
        }
      });
    return () => {
      mounted = false;
      clearTimeout(timeout);
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, color: '#666', fontSize: 14, textAlign: 'center' }}>
          Connecting to server...
        </Text>
        <Text style={{ marginTop: 8, color: '#999', fontSize: 12, textAlign: 'center' }}>
          Make sure your backend is running on Render
        </Text>
        <Pressable
          onPress={() => setError('Skipped - continuing without backend')}
          style={{
            marginTop: 24,
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: '#F2F2F7',
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600' }}>
            Skip & Continue Without Backend
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
