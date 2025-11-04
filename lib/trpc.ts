import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { getBaseUrl } from "@/lib/baseUrl";

export const trpc = createTRPCReact<AppRouter>();

const TRPC_URL = `${getBaseUrl()}/api/trpc`;
console.log("[trpc] Using endpoint:", TRPC_URL);

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpLink({
        url: TRPC_URL,
        transformer: superjson,
        fetch: async (url, options) => {
          const headers = new Headers(options?.headers);
          headers.set("bypass-tunnel-reminder", "true");

          const res = await fetch(url, { ...options, headers });
          if (!res.ok) {
            const text = await res.text();
            console.error("[tRPC] HTTP", res.status, "body:", text.slice(0, 500));
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
          }
          return res;
        },
      }),
    ],
  });
}

export const trpcClient = createTrpcClient();
