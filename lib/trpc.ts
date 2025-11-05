import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { getBaseUrl, loadBaseUrlOverride } from "@/lib/baseUrl";

export const trpc = createTRPCReact<AppRouter>();

// Singleton client - created immediately with default URL
let client: ReturnType<typeof trpc.createClient> | null = null;

function createTrpcClient() {
  const baseUrl = getBaseUrl();
  const TRPC_URL = `${baseUrl}/api/trpc`;

  console.log("[tRPC] Base URL:", baseUrl);
  console.log("[tRPC] Endpoint:", TRPC_URL);

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: TRPC_URL,
        transformer: superjson,
        // NOTE: we keep a custom fetch for extra logging + header
        // IMPORTANT: We do NOT throw on !res.ok - let tRPC handle all responses
        // including errors, so the transformer can properly parse them
        fetch: async (url, options) => {
          console.log("[tRPC] →", String(url), options?.method || "GET");

          const headers = new Headers(options?.headers);
          headers.set("bypass-tunnel-reminder", "true");

          try {
            const res = await fetch(url, { ...options, headers });

            console.log("[tRPC] ←", res.status, String(url));

            // Check Content-Type to detect HTML responses (404 pages, etc.)
            const contentType = res.headers.get("content-type") || "";
            
            if (!res.ok && contentType.includes("text/html")) {
              console.error("[tRPC] ❌ Server returned HTML instead of JSON");
              console.error("[tRPC] Status:", res.status);
              console.error("[tRPC] Content-Type:", contentType);
              
              // Try to read a preview of the HTML response
              const clonedRes = res.clone();
              try {
                const text = await clonedRes.text();
                const preview = text.slice(0, 200);
                console.error("[tRPC] Response preview:", preview);
                
                // Check for common error patterns
                if (text.includes("404") || text.includes("Not Found")) {
                  console.error("[tRPC] 🔍 Route not found - check backend routing");
                } else if (text.includes("502") || text.includes("Bad Gateway")) {
                  console.error("[tRPC] 🔍 Backend may be down or unreachable");
                } else if (text.includes("CORS")) {
                  console.error("[tRPC] 🔍 CORS error - check backend CORS configuration");
                }
              } catch (e) {
                console.error("[tRPC] Could not read response body:", e);
              }
            }

            // Let tRPC handle the response (including errors)
            // This allows the transformer to properly parse error responses
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

/**
 * Get the tRPC client synchronously. Creates it immediately if it doesn't exist.
 * Base URL override will be loaded in the background and applied on next client creation.
 */
export function getTrpcClient() {
  if (!client) {
    console.log('[tRPC] Creating client with current base URL...');
    client = createTrpcClient();
    
    // Load base URL override in background (non-blocking)
    loadBaseUrlOverride().then(() => {
      console.log('[tRPC] Base URL override loaded (if any)');
      // Note: Client will use updated URL on next request
    }).catch(err => {
      console.warn('[tRPC] Failed to load base URL override:', err);
    });
  }
  
  return client;
}

/**
 * Synchronous client getter for contexts that need direct access.
 * Note: This may return null if called before initialization.
 * Prefer using tRPC React hooks (trpc.*.useQuery/useMutation) instead.
 */
export function getTrpcClientSync() {
  return client;
}

/**
 * @deprecated Use tRPC React hooks instead (trpc.*.useQuery/useMutation)
 * This export exists for backward compatibility only.
 */
export const trpcClient = new Proxy({} as ReturnType<typeof trpc.createClient>, {
  get(target, prop) {
    if (!client) {
      console.warn('[tRPC] Client accessed before initialization. Use getTrpcClient() or React hooks instead.');
      return undefined;
    }
    return (client as any)[prop];
  }
});
