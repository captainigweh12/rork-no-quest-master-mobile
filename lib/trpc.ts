import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { getBaseUrl } from "@/lib/baseUrl";

export const trpc = createTRPCReact<AppRouter>();

export function createTrpcClient() {
  const baseUrl = getBaseUrl();
  const TRPC_URL = `${baseUrl}/api/trpc`;
  
  console.log("[trpc] Creating client with base URL:", baseUrl);
  console.log("[trpc] Full tRPC endpoint:", TRPC_URL);
  
  return trpc.createClient({
    links: [
      httpLink({
        url: TRPC_URL,
        transformer: superjson,
        fetch: async (url, options) => {
          console.log("[tRPC] Fetching:", String(url));
          console.log("[tRPC] Method:", options?.method || "GET");
          
          const headers = new Headers(options?.headers);
          headers.set("bypass-tunnel-reminder", "true");

          const res = await fetch(url, { ...options, headers });
          console.log("[tRPC] Response status:", res.status);
          
          if (!res.ok) {
            const text = await res.text();
            console.error("[tRPC] HTTP", res.status, "body:", text.slice(0, 500));
            console.error("[tRPC] Failed URL:", String(url));
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
          }
          return res;
        },
      }),
    ],
  });
}

export const trpcClient = createTrpcClient();
