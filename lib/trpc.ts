import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { getBaseUrl } from "@/lib/baseUrl";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Build the absolute tRPC base on every request so changing the tunnel/override
 * doesn’t require recreating the client.
 */
function buildAbsoluteTrpcBase(): string {
  const base = getBaseUrl().replace(/\/+$/, ""); // strip trailing slash
  return `${base}/api/trpc`; // server also mounted /trpc, but we standardize on /api/trpc
}

/**
 * tRPC client
 * - transformer belongs here (not inside httpLink)
 * - httpLink url can be anything; we’ll rewrite to absolute inside fetch
 */
export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpLink({
      // This is a placeholder; we'll rewrite to absolute in fetch() below.
      url: "/api/trpc",
      fetch: async (url, options) => {
        const absoluteBase = buildAbsoluteTrpcBase();

        // httpLink gives us something like "/api/trpc/example.hi?batch=1"
        // Ensure we only append the path+query to our absolute base once.
        const pathAndSearch = (() => {
          const u = typeof url === "string" ? url : url.toString();
          // Remove any leading host the link might have (we’ll force our own base)
          const parsed = new URL(u, "http://placeholder");
          return `${parsed.pathname}${parsed.search}`;
        })();

        // Final absolute URL
        const finalUrl = `${absoluteBase}${pathAndSearch}`.replace(/([^:]\/)\/+/g, "$1");

        // Add tunnel reminder bypass + keep any provided headers
        const headers = new Headers(options?.headers);
        headers.set("bypass-tunnel-reminder", "true");

        // Minimal diagnostics
        // (Comment out if too chatty)
        console.log("[trpc] →", finalUrl);
        // console.log("[trpc] headers:", Object.fromEntries(headers.entries()));

        const res = await fetch(finalUrl, { ...options, headers });

        // Optional: quick visibility on failures
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
