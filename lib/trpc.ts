import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { getBaseUrl } from "@/lib/baseUrl";

export const trpc = createTRPCReact<AppRouter>();

function buildAbsoluteTrpcBase(): string {
  const base = getBaseUrl().replace(/\/+$/, "");
  return `${base}/api/trpc`;
}

export function createTrpcClient() {
  return trpc.createClient({
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
}

// Backward compatibility: a default client created at import time.
// Prefer calling createTrpcClient() at runtime after base URL bootstrap.
export const trpcClient = createTrpcClient();
