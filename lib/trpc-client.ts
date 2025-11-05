import { createTRPCProxyClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@/backend/trpc/app-router';
import superjson from 'superjson';

const BASE = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ??
             process.env.NEXT_PUBLIC_RORK_API_BASE_URL ??
             '';

export function getTrpcClient(baseUrl?: string) {
  return createTRPCProxyClient<AppRouter>({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: `${baseUrl ?? BASE}/api/trpc`,
        fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
      }),
    ],
  });
}

// Helper to unwrap errors safely
export function unwrapTrpcError(err: unknown) {
  if (err instanceof TRPCClientError) {
    return { code: err.data?.code, message: err.message, cause: 'trpc' as const };
  }
  return { message: String(err), cause: 'unknown' as const };
}