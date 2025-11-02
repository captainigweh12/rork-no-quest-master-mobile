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
console.log('[trpc] tRPC endpoint (dynamic):', `${getBaseUrl()}/api/trpc`);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `/api/trpc`,
      transformer: superjson,
      fetch: async (url, options) => {
        const finalUrl = buildUrlPreservingPath(typeof url === 'string' ? url : url.toString());
        console.log('[trpc] Fetching:', finalUrl);
        console.log('[trpc] Options:', JSON.stringify(options, null, 2));
        
        try {
          const response = await fetch(finalUrl, options);
          console.log('[trpc] Response status:', response.status);
          console.log('[trpc] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
          
          const contentType = response.headers.get('content-type');
          console.log('[trpc] Content-Type:', contentType);
          
          if (!response.ok) {
            const text = await response.text();
            console.error('[trpc] Error response body (first 500 chars):', text.substring(0, 500));
            
            if (contentType?.includes('text/html')) {
              throw new Error(`Backend returned HTML instead of JSON. Status: ${response.status}. Backend might not be running or URL is incorrect. Check: ${getBaseUrl()}`);
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
