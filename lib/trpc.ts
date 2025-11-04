import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { getBaseUrl, loadBaseUrlOverride } from "@/lib/baseUrl";

export const trpc = createTRPCReact<AppRouter>();

// Singleton client so we only create once
let client: ReturnType<typeof trpc.createClient> | null = null;
let clientPromise: Promise<ReturnType<typeof trpc.createClient>> | null = null;

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
        fetch: async (url, options) => {
          console.log("[tRPC] →", String(url), options?.method || "GET");

          const headers = new Headers(options?.headers);
          headers.set("bypass-tunnel-reminder", "true");

          const res = await fetch(url, { ...options, headers });

          console.log("[tRPC] ←", res.status, String(url));

          if (!res.ok) {
            const text = await res.text();
            console.error(
              "[tRPC] HTTP",
              res.status,
              "body:",
              text.slice(0, 500)
            );
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
          }
          return res;
        },
      }),
    ],
  });
}

/**
 * Get a singleton tRPC client. Use this in your Provider setup.
 * Ensures base URL override is loaded before creating client.
 */
export async function getTrpcClient() {
  if (client) return client;
  
  // If already initializing, return that promise
  if (clientPromise) return clientPromise;
  
  // Create new initialization promise
  clientPromise = (async () => {
    console.log('[tRPC] Waiting for base URL to be ready...');
    // Ensure base URL override is loaded
    await loadBaseUrlOverride();
    console.log('[tRPC] Base URL ready, creating client...');
    client = createTrpcClient();
    return client;
  })();
  
  return clientPromise;
}
