import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { loadBaseUrlOverride, getBaseUrl, setBaseUrlOverride } from "@/lib/baseUrl";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const queryClient = new QueryClient();

function createTrpcClient() {
  const baseUrl = getBaseUrl();
  const TRPC_URL = `${baseUrl}/api/trpc`;

  console.log("[TrpcProvider] Creating client with base URL:", baseUrl);
  console.log("[TrpcProvider] tRPC endpoint:", TRPC_URL);

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: TRPC_URL,
        transformer: superjson,
        fetch: async (url, options) => {
          console.log("[tRPC] →", String(url), options?.method || "GET");

          const headers = new Headers(options?.headers);
          headers.set("bypass-tunnel-reminder", "true");

          try {
            const res = await fetch(url, { ...options, headers });
            console.log("[tRPC] ←", res.status, String(url));
            return res;
          } catch (error) {
            console.error("[tRPC] ❌ Fetch error:", error);
            throw error;
          }
        },
      }),
    ],
  });
}

export default function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] =
    useState<ReturnType<typeof trpc.createClient> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'timeout' | 'connection' | 'other' | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log('[TrpcProvider] Starting initialization...');
    
    const initTimeout = setTimeout(() => {
      if (mounted && !client) {
        console.error('[TrpcProvider] ❌ Initialization timeout after 15s');
        setErrorType('timeout');
        setError('Connection timeout. The backend may be starting up or unreachable.');
      }
    }, 15000);
    
    (async () => {
      try {
        console.log('[TrpcProvider] Loading base URL override...');
        const RENDER_URL = 'https://rork-no-quest-master-mobile.onrender.com';

        const currentOverride = await loadBaseUrlOverride();
        console.log('[TrpcProvider] Current override:', currentOverride || 'none');

        const isStaleUrl = currentOverride && 
          !currentOverride.includes('rork-no-quest-master-mobile.onrender.com') &&
          !currentOverride.includes('localhost') &&
          !currentOverride.includes('127.0.0.1') &&
          !currentOverride.includes('10.0.2.2');

        if (isStaleUrl) {
          console.log('[TrpcProvider] ⚠️ Clearing stale URL and setting Render URL');
          await setBaseUrlOverride(RENDER_URL);
        }

        if (!__DEV__) {
          const currentUrl = getBaseUrl();
          if (!currentUrl.includes('rork-no-quest-master-mobile.onrender.com')) {
            console.log('[TrpcProvider] 🔧 Production: Forcing Render URL');
            await setBaseUrlOverride(RENDER_URL);
          }
        }

        console.log('[TrpcProvider] Final URL:', getBaseUrl());
        
        if (mounted) {
          const c = createTrpcClient();
          console.log('[TrpcProvider] ✅ Client created successfully');
          clearTimeout(initTimeout);
          setClient(c);
        }
      } catch (err: any) {
        clearTimeout(initTimeout);
        console.error('[TrpcProvider] ❌ Initialization failed:', err);
        if (mounted) {
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
    })();
    
    return () => {
      mounted = false;
      clearTimeout(initTimeout);
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
              3. Wait for listening on... message{'\n'}
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
