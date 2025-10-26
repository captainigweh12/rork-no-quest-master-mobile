import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

function normalizeBase(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("exp://")) {
    const host = trimmed.replace("exp://", "").replace(/\/$/, "");
    const isSecure = host.includes(".app") || host.includes(".ngrok-free.app") || host.includes(".ngrok.io");
    return `${isSecure ? "https" : "http"}://${host}`;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed.replace(/\/$/, "");
  const isSecure = trimmed.includes(".app") || trimmed.includes(".ngrok-free.app") || trimmed.includes(".ngrok.io");
  return `${isSecure ? "https" : "http"}://${trimmed.replace(/\/$/, "")}`;
}

function computeBaseUrl(): string {
  const envBase = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envBase && envBase.trim().length > 0) return normalizeBase(envBase);

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && (window as any).location?.origin) {
      return (window as any).location.origin;
    }
  }

  const hostUri = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    const isSecure = host.includes(".app") || host.includes(".ngrok-free.app") || host.includes(".ngrok.io");
    return `${isSecure ? "https" : "http"}://${host}`;
  }

  console.warn("[trpc] Missing EXPO_PUBLIC_RORK_API_BASE_URL and cannot infer host. Defaulting to http://localhost:8081");
  return "http://localhost:8081";
}

const baseUrl = computeBaseUrl();

console.log('[trpc] Base URL:', baseUrl);
console.log('[trpc] tRPC endpoint:', `${baseUrl}/api/trpc`);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      fetch: async (url, options) => {
        console.log('[trpc] Fetching:', url);
        console.log('[trpc] Options:', JSON.stringify(options, null, 2));
        
        try {
          const response = await fetch(url, options);
          console.log('[trpc] Response status:', response.status);
          console.log('[trpc] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
          
          const contentType = response.headers.get('content-type');
          console.log('[trpc] Content-Type:', contentType);
          
          if (!response.ok) {
            const text = await response.text();
            console.error('[trpc] Error response body (first 500 chars):', text.substring(0, 500));
            
            if (contentType?.includes('text/html')) {
              throw new Error(`Backend returned HTML instead of JSON. Status: ${response.status}. Backend might not be running or URL is incorrect. Check: ${baseUrl}`);
            }
          }
          
          return response;
        } catch (error: any) {
          console.error('[trpc] Fetch error:', error);
          throw error;
        }
      },
    }),
  ],
});
