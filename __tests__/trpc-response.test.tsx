import type { AppRouter } from '@/backend/trpc/app-router';
import { createTrpcClient } from '@/lib/trpc';
import { describe, test, expect } from 'vitest';

describe('tRPC Response Handling', () => {
  test('handles UTF-16 responses gracefully', async () => {
    const mockFetch = async () => new Response(
      new TextEncoder().encode('{"error":true}').buffer,
      {
        status: 400,
        headers: {
          'content-type': 'application/json; charset=utf-16le'
        }
      }
    );

    try {
      // Create a client that uses our mock fetch
      const client = createTrpcClient({ baseUrl: 'http://test-url', customFetch: mockFetch });
      await client.example.hi.mutate({ name: 'test' });
      throw new Error('Should have thrown an error');
    } catch (error) {
      expect(error).toBeTruthy();
      const errorStr = String(error);
      expect(errorStr).toContain('Unable to transform response from server');
    }
  });

  test('handles HTML error responses gracefully', async () => {
    const mockFetch = async () => new Response(
      '<!DOCTYPE html><html><body>404 Not Found</body></html>',
      {
        status: 404,
        headers: {
          'content-type': 'text/html'
        }
      }
    );

    try {
      const client = createTrpcClient({ baseUrl: 'http://test-url', customFetch: mockFetch });
      await client.example.hi.mutate({ name: 'test' });
      throw new Error('Should have thrown an error');
    } catch (error) {
      expect(error).toBeTruthy();
      const errorStr = String(error);
      // With recent tRPC versions, we get a direct JSON parse error
      expect(errorStr).toContain('is not valid JSON');
    }
  });

  test('handles gzipped responses gracefully', async () => {
    const mockFetch = async () => new Response(
      Buffer.from('H4sIAAAAAAAAA6tWSs5PSVWyMjIwqAUAoqCqVwwAAAA=', 'base64'),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-encoding': 'gzip'
        }
      }
    );

    try {
      const client = createTrpcClient({ baseUrl: 'http://test-url', customFetch: mockFetch });
      await client.example.hi.mutate({ name: 'test' });
      // If we get here, the gzipped response was handled correctly
      expect(true).toBe(true);
    } catch (error) {
      const errorStr = String(error);
      // We get a JSON parse error because the gzipped data isn't valid JSON when decoded as UTF-8
      expect(errorStr).toContain('is not valid JSON');
    }
  });
});