import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { getBaseUrl } from "@/lib/baseUrl";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Build the absolute tRPC base on every request so changing the tunnel/override
 * doesn't require recreating the client.
 */
function buildAbsoluteTrpcBase(): string {
  const base = getBaseUrl().replace(/\/+$/, "");
  return `${base}/api/trpc`;
}

/**
 * tRPC client
 */
export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      transformer: superjson,
      url: buildAbsoluteTrpcBase(),
      headers: () => ({
        "bypass-tunnel-reminder": "true",
      }),
    }),
  ],
});
