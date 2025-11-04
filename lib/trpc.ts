import { createTRPCReact, createTRPCClient as createVanillaTRPCClient } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { getBaseUrl } from "@/lib/baseUrl";

export const trpc = createTRPCReact<AppRouter>();

function buildAbsoluteTrpcBase(): string {
  const base = getBaseUrl().replace(/\/+$/, "");
  const url = `${base}/api/trpc`;
  console.log("[tRPC Client] Building URL:", url);
  return url;
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
        fetch(url, options) {
          console.log("[tRPC Client] Fetching:", url);
          return fetch(url, options).then((res) => {
            console.log("[tRPC Client] Response status:", res.status);
            console.log("[tRPC Client] Response headers:", Object.fromEntries(res.headers.entries()));
            return res;
          }).catch((err) => {
            console.error("[tRPC Client] Fetch error:", err);
            throw err;
          });
        },
      }),
    ],
  });
}

// Vanilla client for use outside of React components
export const trpcClient = createVanillaTRPCClient<AppRouter>({
  links: [
    httpLink({
      transformer: superjson,
      url: buildAbsoluteTrpcBase(),
      headers: () => ({
        "bypass-tunnel-reminder": "true",
      }),
      fetch(url, options) {
        console.log("[tRPC Vanilla Client] Fetching:", url);
        return fetch(url, options).then((res) => {
          console.log("[tRPC Vanilla Client] Response status:", res.status);
          return res;
        }).catch((err) => {
          console.error("[tRPC Vanilla Client] Fetch error:", err);
          throw err;
        });
      },
    }),
  ],
});
