import { describe, test, expect } from 'vitest';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { TRPCClientError } from '@trpc/client';
import superjson from 'superjson';
import { getBaseUrl } from '@/lib/baseUrl';
import type { AppRouter } from '@/backend/trpc/app-router';

describe('tRPC Client Error Handling', () => {
  test('handles non-UTF8 responses gracefully', async () => {
    const baseUrl = getBaseUrl();
    const client = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${baseUrl}/api/trpc`,
          transformer: superjson,
          fetch: async (url, opts) => {
            // Mock a UTF-16 response
            return new Response(
              new TextEncoder().encode('{"error":true}').buffer,
              {
                status: 400,
                headers: {
                  'content-type': 'application/json; charset=utf-16le'
                }
              }
            );
          }
        })
      ]
    });

    try {
      // Try any procedure, it will be intercepted by our mock
      await client.example.hi.mutate({ name: 'test' });
      throw new Error('Should have thrown');
    } catch (error) {
      // Should handle the error gracefully
      const trpcError = error as TRPCClientError<AppRouter>;
      expect(trpcError).toBeTruthy();
      expect(String(error)).not.toContain('Unexpected token');
    }
  });

  test('handles HTML error responses gracefully', async () => {
    const baseUrl = getBaseUrl();
    const client = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${baseUrl}/api/trpc`,
          transformer: superjson,
          fetch: async (url, opts) => {
            // Mock an HTML error response
            return new Response(
              '<!DOCTYPE html><html><body>404 Not Found</body></html>',
              {
                status: 404,
                headers: {
                  'content-type': 'text/html'
                }
              }
            );
          }
        })
      ]
    });

    try {
      await client.example.hi.mutate({ name: 'test' });
      throw new Error('Should have thrown');
    } catch (error) {
      const trpcError = error as TRPCClientError<AppRouter>;
      expect(trpcError).toBeTruthy();
      expect(String(error)).not.toContain('Unexpected token');
      expect(String(error)).toContain('Server returned non-JSON response');
    }
  });
});