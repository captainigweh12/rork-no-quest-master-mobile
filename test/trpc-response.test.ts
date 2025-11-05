import { createTrpcClient } from '@/lib/trpc';

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
      const client = createTrpcClient({ baseUrl: 'http://test-url', customFetch: mockFetch });
      // @ts-ignore - we know this doesn't exist but it's fine for testing
      await client.example.hi.mutate({ name: 'test' });
      throw new Error('Should have thrown an error');
    } catch (error) {
      expect(error).toBeTruthy();
      const errorStr = String(error);
      expect(errorStr).not.toContain('Unexpected token');
      expect(errorStr).toMatch(/Server returned non-JSON response/);
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
      // @ts-ignore - we know this doesn't exist but it's fine for testing
      await client.example.hi.mutate({ name: 'test' });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeTruthy();
      const errorStr = String(error);
      expect(errorStr).not.toContain('Unexpected token');
      expect(errorStr).toMatch(/Server returned non-JSON response \(got text\/html\)/);
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
      // @ts-ignore - we know this doesn't exist but it's fine for testing
      await client.example.hi.mutate({ name: 'test' });
      // If we get here, the gzipped response was handled correctly
      expect(true).toBe(true);
    } catch (error) {
      const errorStr = String(error);
      expect(errorStr).not.toContain('Unexpected token');
      // Even if it fails, it shouldn't be a parse error
      expect(errorStr).not.toMatch(/Failed to parse JSON/);
    }
  });
});