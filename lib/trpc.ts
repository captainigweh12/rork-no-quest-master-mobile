import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { getBaseUrl } from "@/lib/baseUrl";

export const trpc = createTRPCReact<AppRouter>();

function buildUrlPreservingPath(originalUrl: string): string {
  try {
    const base = getBaseUrl();
    const parsed = new URL(originalUrl, "http://placeholder");
    const pathAndSearch = `${parsed.pathname}${parsed.search}`;
    return `${base}${pathAndSearch}`;
  } catch (e) {
    console.warn('[trpc] Failed to parse url, falling back to original', originalUrl, e);
    return originalUrl;
  }
}

console.log('[trpc] Base URL (dynamic):', getBaseUrl());
console.log('[trpc] Full tRPC endpoint:', `${getBaseUrl()}/api/trpc`);
console.log('[trpc] Environment EXPO_PUBLIC_RORK_API_BASE_URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `/api/trpc`,
      transformer: superjson,
      fetch: async (url, options) => {
        const finalUrl = buildUrlPreservingPath(typeof url === 'string' ? url : url.toString());
        console.log('[trpc] Fetching:', finalUrl);
        
        const headers = new Headers(options?.headers);
        headers.set('bypass-tunnel-reminder', 'true');
        
        const modifiedOptions = {
          ...options,
          headers,
        };
        
        console.log('[trpc] Request headers:', JSON.stringify(Object.fromEntries(headers.entries()), null, 2));
        
        try {
          const response = await fetch(finalUrl, modifiedOptions);
          console.log('[trpc] Response status:', response.status);
          console.log('[trpc] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
          
          const contentType = response.headers.get('content-type');
          console.log('[trpc] Content-Type:', contentType);
          
          if (!response.ok) {
            const text = await response.text();
            console.error('[trpc] Error response status:', response.status);
            console.error('[trpc] Error response body (first 500 chars):', text.substring(0, 500));
            console.error('[trpc] Expected URL format: ${baseUrl}/api/trpc');
            console.error('[trpc] Current base URL:', getBaseUrl());
            
            if (contentType?.includes('text/html')) {
              throw new Error(`Backend returned HTML (${response.status}). URL might be incorrect. Trying to reach: ${finalUrl}. Expected base: ${getBaseUrl()}`);
            } else {
              throw new Error(`Request failed with status ${response.status}. URL: ${finalUrl}. Response: ${text.substring(0, 200)}`);
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
