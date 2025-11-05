import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { TRPCClientError } from '@trpc/client';
import superjson from 'superjson';
import { getBaseUrl } from '@/lib/baseUrl';
import type { AppRouter } from '@/backend/trpc/app-router';

async function testEndpoint() {
  const baseUrl = getBaseUrl();
  const TRPC_URL = `${baseUrl}/api/trpc`;
  
  console.log('🔍 Testing tRPC client with URL:', TRPC_URL);
  
  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: TRPC_URL,
        transformer: superjson,
        headers: () => ({
          'bypass-tunnel-reminder': 'true'
        }),
      }),
    ],
  });

  try {
    // Test a known endpoint
    const result = await client.health.check.query();
    console.log('✅ Success:', result);
  } catch (error) {
    console.log('❌ Error:', error);
    
    // Check error response encoding
    const trpcError = error as TRPCClientError<AppRouter>;
    if (trpcError.data?.response) {
      const response = trpcError.data.response as Response;
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      try {
        const arrayBuffer = await response.clone().arrayBuffer();
        console.log('Response size:', arrayBuffer.byteLength, 'bytes');
        
        // Try UTF-8
        try {
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          const utf8Text = utf8Decoder.decode(arrayBuffer);
          console.log('UTF-8 decode successful:', utf8Text.slice(0, 200));
        } catch (decodeError) {
          const err = decodeError as Error;
          console.log('UTF-8 decode failed:', err.message);
          
          // Try UTF-16
          try {
            const utf16Decoder = new TextDecoder('utf-16le', { fatal: false });
            const utf16Text = utf16Decoder.decode(arrayBuffer);
            console.log('UTF-16LE decode successful:', utf16Text.slice(0, 200));
          } catch (utf16Error) {
            const err = utf16Error as Error;
            console.log('UTF-16 decode also failed:', err.message);
          }
        }
      } catch (responseError) {
        const err = responseError as Error;
        console.log('Failed to examine response:', err.message);
      }
    }
  }
}

// Run the test
console.log('🚀 Starting tRPC connection test...');
testEndpoint().catch(console.error);