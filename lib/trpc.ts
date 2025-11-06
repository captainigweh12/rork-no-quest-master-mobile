import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/backend/trpc/app-router';
import superjson from 'superjson';
import { getBaseUrl } from '@/lib/baseUrl';

export const trpc = createTRPCReact<AppRouter>();

type CreateTrpcClientOptions = {
  baseUrl?: string;
  customFetch?: typeof fetch;
};

export const createTrpcClient = (options: CreateTrpcClientOptions | string = {}) => {
  // Handle legacy string argument for backward compatibility
  const opts = typeof options === 'string' ? { baseUrl: options } : options;
  const baseUrl = opts.baseUrl ?? getBaseUrl();
  const url = `${baseUrl}/api/trpc`;
  
  console.log('[tRPC] Creating client with base URL:', baseUrl);
  console.log('[tRPC] Endpoint:', url);

  return trpc.createClient({
    links: [
      httpBatchLink({
        url,
        transformer: superjson,
        fetch: async (input, init) => {
          console.log('[tRPC] →', String(input), init?.method || 'GET');

          // Use custom fetch if provided, otherwise use default fetch with headers
          if (opts.customFetch) {
            return opts.customFetch(input, init);
          }

          const headers = new Headers(init?.headers);
          headers.set('bypass-tunnel-reminder', 'true');

          const response = await fetch(input, { ...init, headers });
          console.log('[tRPC] ←', response.status, String(input));

          const contentType = response.headers.get('content-type') || '';
          
          if (!contentType.includes('application/json')) {
            console.error('[tRPC] ❌ Server returned non-JSON response');
            console.error('[tRPC] Status:', response.status);
            console.error('[tRPC] Content-Type:', contentType);
            
            const clonedResponse = response.clone();
            try {
              const preview = await clonedResponse.text();
              console.error('[tRPC] Response preview:', preview.slice(0, 200));
            } catch (e) {
              console.error('[tRPC] Could not read response preview');
            }
            
            return new Response(
              JSON.stringify({
                error: {
                  message: `Server returned non-JSON response (got ${contentType})`,
                  code: 'PARSE_ERROR'
                }
              }),
              {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          
          return response;
        }
      })
    ]
  });
};

// Backwards-compatible alias for code that imports `getTrpcClient`
export const getTrpcClient = (options: CreateTrpcClientOptions | string = {}) =>
  createTrpcClient(options as any);
