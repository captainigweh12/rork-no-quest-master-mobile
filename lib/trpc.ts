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
      url: "/api/trpc",
      fetch: async (url, options) => {
        const absoluteBase = buildAbsoluteTrpcBase();

        // httpLink gives us something like "/api/trpc/example.hi?batch=1"
        // We need to strip "/api/trpc" prefix since absoluteBase already has it
        const pathAndSearch = (() => {
          const u = typeof url === "string" ? url : url.toString();
          const parsed = new URL(u, "http://placeholder");
          let pathname = parsed.pathname;
          
          // Remove the /api/trpc prefix if present (since absoluteBase already has it)
          if (pathname.startsWith('/api/trpc')) {
            pathname = pathname.substring('/api/trpc'.length);
          } else if (pathname.startsWith('/trpc')) {
            pathname = pathname.substring('/trpc'.length);
          }
          
          return `${pathname}${parsed.search}`;
        })();

        // Final absolute URL
        const finalUrl = `${absoluteBase}${pathAndSearch}`;

        // Add tunnel reminder bypass + keep any provided headers
        const headers = new Headers(options?.headers);
        headers.set("bypass-tunnel-reminder", "true");

        console.log("[trpc] →", finalUrl);

        const res = await fetch(finalUrl, { ...options, headers });

        if (!res.ok) {
          const ct = res.headers.get("content-type") || "";
          const body = await res.text();
          console.error("[trpc] ✖", res.status, finalUrl);
          console.error("[trpc] body(first 500):", body.slice(0, 500));

          if (ct.includes("text/html")) {
            throw new Error(
              `Backend returned HTML (${res.status}). URL likely wrong. Tried: ${finalUrl}`
            );
          }
          throw new Error(
            `tRPC request failed ${res.status}. URL: ${finalUrl}. Body: ${body.slice(0, 200)}`
          );
        }

        return res;
      },
    }),
  ],
});
