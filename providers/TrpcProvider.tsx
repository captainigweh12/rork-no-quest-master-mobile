import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, getTrpcClient } from "@/lib/trpc";
import { View, Text, ActivityIndicator, Pressable, Linking } from "react-native";
import { getBaseUrl } from "@/lib/baseUrl";

const queryClient = new QueryClient();

export default function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] =
    useState<ReturnType<typeof trpc.createClient> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'timeout' | 'connection' | 'other' | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log('[TrpcProvider] Initializing tRPC client...');
    
    const timeout = setTimeout(() => {
      if (mounted && !client) {
        console.error('[TrpcProvider] ❌ Initialization timeout after 10s');
        setErrorType('timeout');
        setError('Connection timeout. The backend may be starting up or unreachable.');
      }
    }, 10000); // Increased to 10s for Render cold starts
    
    try {
      const c = getTrpcClient();
      clearTimeout(timeout);
      if (mounted) {
        console.log('[TrpcProvider] ✅ Client ready');
        setClient(c);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      console.error('[TrpcProvider] ❌ Failed to initialize:', err);
      if (mounted) {
        // Provide more helpful error messages
        let errorMsg = err.message || 'Failed to initialize tRPC';
        let type: 'timeout' | 'connection' | 'other' = 'other';
        
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Network request failed') || errorMsg.includes('ECONNREFUSED')) {
          type = 'connection';
          errorMsg = 'Cannot connect to backend server.';
        } else if (errorMsg.includes('JSON') || errorMsg.includes('HTML')) {
          type = 'other';
          errorMsg = 'Server returned invalid response (HTML instead of JSON).';
        }
        
        setErrorType(type);
        setError(errorMsg);
      }
    }
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  if (error) {
    const baseUrl = getBaseUrl();
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('10.0.2.2');
    
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ color: '#FF3B30', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
          Backend Connection Failed
        </Text>
        <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
          {error}
        </Text>
        
        {errorType === 'connection' && isLocalhost && (
          <View style={{ backgroundColor: '#FFF3CD', padding: 16, borderRadius: 8, marginBottom: 16, width: '100%' }}>
            <Text style={{ color: '#856404', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
              💡 Backend Not Running
            </Text>
            <Text style={{ color: '#856404', fontSize: 12, marginBottom: 8 }}>
              The backend server is not running on {baseUrl}
            </Text>
            <Text style={{ color: '#856404', fontSize: 12, fontWeight: '600', marginTop: 8 }}>
              To start the backend:
            </Text>
            <Text style={{ color: '#856404', fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>
              1. Open a new terminal{'\n'}
              2. Run: npm run backend{'\n'}
              3. Wait for "listening on..." message{'\n'}
              4. Restart this app
            </Text>
          </View>
        )}
        
        {errorType === 'connection' && !isLocalhost && (
          <View style={{ backgroundColor: '#FFF3CD', padding: 16, borderRadius: 8, marginBottom: 16, width: '100%' }}>
            <Text style={{ color: '#856404', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
              💡 Backend Unreachable
            </Text>
            <Text style={{ color: '#856404', fontSize: 12, marginBottom: 8 }}>
              Cannot reach backend at: {baseUrl}
            </Text>
            <Text style={{ color: '#856404', fontSize: 12 }}>
              • Check if the backend is deployed and running{'\n'}
              • Verify the URL in your .env file{'\n'}
              • Check your internet connection
            </Text>
          </View>
        )}
        
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Pressable
            onPress={() => {
              setError(null);
              setErrorType(null);
              // Retry connection
              window.location?.reload?.();
            }}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              backgroundColor: '#007AFF',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
              Retry Connection
            </Text>
          </Pressable>
          
          <Pressable
            onPress={() => setError('Skipped - continuing without backend')}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              backgroundColor: '#F2F2F7',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600' }}>
              Skip for Now
            </Text>
          </Pressable>
        </View>
        
        <Text style={{ marginTop: 24, color: '#999', fontSize: 11, textAlign: 'center' }}>
          Current backend URL: {baseUrl}
        </Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#666', fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
          Connecting to Backend...
        </Text>
        <Text style={{ marginTop: 8, color: '#999', fontSize: 13, textAlign: 'center' }}>
          {getBaseUrl()}
        </Text>
        <Text style={{ marginTop: 16, color: '#999', fontSize: 12, textAlign: 'center', maxWidth: 300 }}>
          This may take a few seconds if the backend is starting up (cold start on Render can take 30-60 seconds)
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
