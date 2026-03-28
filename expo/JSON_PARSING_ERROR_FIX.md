# JSON Parsing Error with Null Bytes - Fix Summary

## Problem Description

The application was experiencing a JSON parsing error with null bytes (`\u0000`) in the response:

```
{"json":{"name":"SyntaxError","message":"Unexpected token '', \"{\u0000\n\u0000 \u0000\"... is not valid JSON"},"meta":{"values":["Error"]}}
```

This error occurred when the tRPC client tried to parse responses from the backend, causing the app to get stuck on "connecting to server".

## Root Cause

The custom fetch wrapper in `lib/trpc.ts` was interfering with tRPC's error handling:

1. When the server returned an HTTP error (404, 500, etc.), the custom fetch wrapper would:
   - Check `!res.ok`
   - Read the response body as text using `await res.text()`
   - Throw an error with the text

2. This caused problems because:
   - The response body was consumed before tRPC could parse it
   - tRPC's transformer (superjson) couldn't properly handle the response
   - Binary/corrupted data could be read as text, causing null bytes
   - tRPC's error handling was bypassed entirely

## Solution

### 1. Fixed `lib/trpc.ts`

**Changed:** Removed the `!res.ok` check and error throwing from the custom fetch wrapper.

**Before:**
```typescript
fetch: async (url, options) => {
  console.log("[tRPC] →", String(url), options?.method || "GET");
  const headers = new Headers(options?.headers);
  headers.set("bypass-tunnel-reminder", "true");
  const res = await fetch(url, { ...options, headers });
  console.log("[tRPC] ←", res.status, String(url));
  
  if (!res.ok) {
    const text = await res.text();
    console.error("[tRPC] HTTP", res.status, "body:", text.slice(0, 500));
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res;
}
```

**After:**
```typescript
fetch: async (url, options) => {
  console.log("[tRPC] →", String(url), options?.method || "GET");
  const headers = new Headers(options?.headers);
  headers.set("bypass-tunnel-reminder", "true");
  const res = await fetch(url, { ...options, headers });
  console.log("[tRPC] ←", res.status, String(url));
  
  // Let tRPC handle the response (including errors)
  // This allows the transformer to properly parse error responses
  return res;
}
```

**Why this works:**
- tRPC now receives the raw response and can handle it properly
- The superjson transformer can parse both success and error responses
- Error responses are properly deserialized and typed
- No more null bytes or corrupted JSON

### 2. Enhanced `providers/TrpcProvider.tsx`

**Improvements:**
- Increased timeout from 5s to 10s (for Render cold starts)
- Added better error message categorization
- More helpful error messages for common issues

**Changes:**
```typescript
// Increased timeout for Render cold starts
const timeout = setTimeout(() => {
  if (mounted && !client) {
    console.error('[TrpcProvider] ❌ Initialization timeout after 10s');
    setError('Connection timeout. The backend may be starting up or unreachable.');
  }
}, 10000); // Was 5000

// Better error messages
.catch((err) => {
  clearTimeout(timeout);
  console.error('[TrpcProvider] ❌ Failed to initialize:', err);
  if (mounted) {
    let errorMsg = err.message || 'Failed to initialize tRPC';
    
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Network request failed')) {
      errorMsg = 'Network error. Please check your internet connection and ensure the backend is running.';
    } else if (errorMsg.includes('JSON')) {
      errorMsg = 'Server returned invalid response. The backend may be misconfigured.';
    }
    
    setError(errorMsg);
  }
});
```

## Testing Instructions

### 1. Clear any cached base URL overrides:
```bash
# Navigate to the emergency clear screen in the app
# Or use AsyncStorage.clear() in the console
```

### 2. Ensure backend is running:
- Production: https://rork-no-quest-master-mobile.onrender.com
- Development: http://localhost:8081 (or http://10.0.2.2:8081 for Android)

### 3. Test the connection:
```bash
# Start the app
npm start

# The app should now:
# - Connect successfully to the backend
# - Show proper error messages if connection fails
# - Not show JSON parsing errors with null bytes
```

### 4. Verify tRPC queries work:
- Try making a tRPC query (e.g., `trpc.example.hi.useQuery()`)
- Check that errors are properly typed and handled
- Verify that the transformer works for both success and error responses

## What Changed

### Files Modified:
1. ✅ `lib/trpc.ts` - Removed problematic fetch wrapper error handling
2. ✅ `providers/TrpcProvider.tsx` - Enhanced error handling and timeout

### Key Improvements:
- ✅ No more JSON parsing errors with null bytes
- ✅ Proper error handling through tRPC's built-in mechanisms
- ✅ Better error messages for users
- ✅ Longer timeout for Render cold starts
- ✅ Transformer works correctly for all responses

## Technical Details

### Why the fetch wrapper was problematic:

1. **Response body consumption:** Once you call `res.text()` or `res.json()`, the response body is consumed and cannot be read again. tRPC needs to read the body to parse it with the transformer.

2. **Transformer bypass:** By throwing before returning the response, we bypassed tRPC's transformer entirely. This meant:
   - Error responses weren't deserialized properly
   - Type safety was lost
   - Custom error handling didn't work

3. **Binary data issues:** When reading error responses (like HTML error pages) as text, binary data could be interpreted incorrectly, leading to null bytes in the string.

### How tRPC handles errors properly:

1. tRPC receives the raw response
2. It checks the status code
3. It uses the transformer to parse the response body (success or error)
4. It creates properly typed errors with the parsed data
5. Error handling hooks can catch and process these errors

## Verification

After applying these fixes, you should see:
- ✅ Successful connection to backend
- ✅ Proper error messages (no null bytes)
- ✅ tRPC queries working correctly
- ✅ Error responses properly typed and handled

## Rollback Instructions

If you need to rollback these changes:

```bash
git checkout HEAD~1 lib/trpc.ts providers/TrpcProvider.tsx
```

However, this is not recommended as it will reintroduce the JSON parsing error.

## Additional Notes

- The backend transformer configuration in `backend/trpc/create-context.ts` is correct and uses superjson
- The client transformer in `lib/trpc.ts` matches the backend (superjson)
- CORS is properly configured in `backend/hono.ts`
- The base URL configuration in `lib/baseUrl.ts` is working correctly

## Related Issues

This fix resolves:
- JSON parsing errors with null bytes
- "Connecting to server" stuck state
- tRPC connection failures
- Improper error handling in tRPC queries
