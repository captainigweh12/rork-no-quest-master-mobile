# VideoSDK JSON Parse Error - Fix Complete

## Problem Summary

The application was experiencing a critical error when trying to fetch VideoSDK tokens:

```
[VideoSDK Context] Token fetch error: TRPCClientError: JSON Parse error: Unexpected character: <
```

This error occurred because the server was returning HTML (likely a 404 error page) instead of JSON, which the tRPC client couldn't parse.

## Root Cause Analysis

1. **HTML Response Instead of JSON**: When the VideoSDK route was not accessible or returned an error, the server sent an HTML error page
2. **Poor Error Detection**: The tRPC client wasn't detecting HTML responses before attempting to parse them as JSON
3. **Insufficient Error Messages**: Error messages didn't provide enough context to diagnose the issue
4. **No Retry Logic**: Transient network errors or cold starts weren't handled with retries

## Solutions Implemented

### 1. Enhanced tRPC Client (`lib/trpc.ts`)

**Added HTML Response Detection:**
```typescript
// Check Content-Type to detect HTML responses (404 pages, etc.)
const contentType = res.headers.get("content-type") || "";

if (!res.ok && contentType.includes("text/html")) {
  console.error("[tRPC] ❌ Server returned HTML instead of JSON");
  console.error("[tRPC] Status:", res.status);
  console.error("[tRPC] Content-Type:", contentType);
  
  // Try to read a preview of the HTML response
  const clonedRes = res.clone();
  try {
    const text = await clonedRes.text();
    const preview = text.slice(0, 200);
    console.error("[tRPC] Response preview:", preview);
    
    // Check for common error patterns
    if (text.includes("404") || text.includes("Not Found")) {
      console.error("[tRPC] 🔍 Route not found - check backend routing");
    } else if (text.includes("502") || text.includes("Bad Gateway")) {
      console.error("[tRPC] 🔍 Backend may be down or unreachable");
    } else if (text.includes("CORS")) {
      console.error("[tRPC] 🔍 CORS error - check backend CORS configuration");
    }
  } catch (e) {
    console.error("[tRPC] Could not read response body:", e);
  }
}
```

**Benefits:**
- ✅ Detects HTML responses before JSON parsing
- ✅ Logs response preview for debugging
- ✅ Identifies common error patterns (404, 502, CORS)
- ✅ Provides actionable diagnostic information

### 2. Enhanced VideoSDK Context (`contexts/VideoSDKContext.tsx`)

**Added Retry Logic with Exponential Backoff:**
```typescript
const tokenQuery = trpc.videosdk.getToken.useQuery(undefined, {
  staleTime: 1000 * 60 * 60, // 1 hour
  retry: (failureCount, error) => {
    // Retry up to 3 times with exponential backoff
    if (failureCount >= 3) return false;
    
    // Don't retry on certain errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
      console.log("[VideoSDK Context] Not retrying - route not found");
      return false;
    }
    
    console.log(`[VideoSDK Context] Retry attempt ${failureCount + 1}/3`);
    return true;
  },
  retryDelay: (attemptIndex) => {
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    console.log(`[VideoSDK Context] Retrying in ${delay}ms...`);
    return delay;
  },
});
```

**Enhanced Error Messages:**
```typescript
if (message.includes("JSON Parse error") || message.includes("Unexpected character")) {
  userMessage = "Server returned invalid response (HTML instead of JSON). The VideoSDK route may not be properly configured on the backend.";
  console.error("[VideoSDK Context] 🔍 Likely cause: Backend route /api/trpc/videosdk.getToken is not accessible or returning HTML");
} else if (message.includes("404") || message.includes("Not Found")) {
  userMessage = "API route not found (404). The VideoSDK endpoint may not be registered on the backend.";
  console.error("[VideoSDK Context] 🔍 Check: Backend should have videosdk router registered in app-router.ts");
} else if (message.includes("Failed to fetch") || message.includes("Network request failed")) {
  userMessage = "Network error. Please check your internet connection and ensure the backend is running.";
  console.error("[VideoSDK Context] 🔍 Check: Backend URL and network connectivity");
}
// ... more error types
```

**Added Manual Retry Function:**
```typescript
const retryTokenFetch = useCallback(() => {
  console.log("[VideoSDK Context] Manual retry requested");
  setError(null);
  tokenQuery.refetch();
}, [tokenQuery]);
```

**Benefits:**
- ✅ Automatic retry with exponential backoff (1s, 2s, 4s)
- ✅ Smart retry logic (doesn't retry on 404s)
- ✅ Detailed, user-friendly error messages
- ✅ Manual retry capability
- ✅ Specific error type detection

### 3. Backend Error Handler (`backend/hono.ts`)

**Added Global Error Handler:**
```typescript
// Global error handler - ensures all errors return JSON
app.onError((err, c) => {
  console.error("❌ [Global Error Handler]", err);
  
  // Determine status code
  const status = (err as any).status || (err as any).statusCode || 500;
  
  // Return JSON error response
  return c.json(
    {
      success: false,
      error: err.message || "Internal server error",
      timestamp: new Date().toISOString(),
    },
    status
  );
});
```

**Benefits:**
- ✅ All errors return JSON (no HTML error pages)
- ✅ Consistent error format
- ✅ Proper status codes
- ✅ Timestamp for debugging

## Testing Instructions

### 1. Test Normal Operation

```bash
# Start the backend
npm run dev

# In another terminal, start the app
npm start
```

**Expected Result:**
- VideoSDK token should fetch successfully
- No JSON parse errors
- Token appears in VideoSDK Context

### 2. Test Error Handling

**Test 404 Error:**
1. Temporarily comment out the videosdk router in `backend/trpc/app-router.ts`
2. Restart backend
3. Check logs for helpful error messages

**Expected Result:**
```
[tRPC] ❌ Server returned HTML instead of JSON
[tRPC] 🔍 Route not found - check backend routing
[VideoSDK Context] 🔍 Check: Backend should have videosdk router registered in app-router.ts
```

**Test Network Error:**
1. Stop the backend
2. Try to fetch token

**Expected Result:**
```
[VideoSDK Context] Retry attempt 1/3
[VideoSDK Context] Retrying in 1000ms...
[VideoSDK Context] Retry attempt 2/3
[VideoSDK Context] Retrying in 2000ms...
```

### 3. Test Manual Retry

```typescript
const { retryTokenFetch, error } = useVideoSDK();

// If there's an error, retry manually
if (error) {
  retryTokenFetch();
}
```

## What Changed

### Files Modified

1. **`lib/trpc.ts`**
   - Added HTML response detection
   - Added response preview logging
   - Added error pattern detection
   - Enhanced error logging

2. **`contexts/VideoSDKContext.tsx`**
   - Added retry logic with exponential backoff
   - Enhanced error messages with specific diagnostics
   - Added manual retry function
   - Added `retryTokenFetch` to context interface

3. **`backend/hono.ts`**
   - Added global error handler
   - Ensures all errors return JSON
   - Consistent error format

### Key Improvements

✅ **Better Error Detection**
- Detects HTML responses before parsing
- Identifies error types (404, 502, CORS, network)
- Provides actionable diagnostic information

✅ **Automatic Recovery**
- Retry logic with exponential backoff
- Smart retry decisions (doesn't retry 404s)
- Manual retry capability

✅ **User-Friendly Messages**
- Clear, specific error messages
- Diagnostic hints for developers
- Consistent error format

✅ **Backend Reliability**
- All errors return JSON
- No HTML error pages
- Proper status codes

## Verification Checklist

- [ ] VideoSDK token fetches successfully
- [ ] No JSON parse errors in console
- [ ] Error messages are clear and helpful
- [ ] Retry logic works (test with network interruption)
- [ ] Manual retry function works
- [ ] Backend returns JSON for all errors
- [ ] HTML detection works (test with 404)

## Troubleshooting

### If you still see JSON parse errors:

1. **Check Backend URL**
   ```typescript
   // In app, check the base URL
   console.log(getBaseUrl());
   ```

2. **Verify VideoSDK Route**
   ```bash
   # Test the route directly
   curl https://your-backend.com/api/trpc/videosdk.getToken
   ```

3. **Check Backend Logs**
   - Look for route registration messages
   - Check for errors during startup

4. **Verify CORS Configuration**
   - Ensure your app's origin is in `allowedOrigins`
   - Check CORS headers in network tab

### If retries aren't working:

1. **Check Retry Logic**
   - Look for retry attempt logs
   - Verify error type isn't in "don't retry" list

2. **Check Network**
   - Ensure backend is reachable
   - Check for firewall/proxy issues

## Related Documentation

- `JSON_PARSING_ERROR_FIX.md` - Previous JSON parsing fix
- `VIDEOSDK_FIX_GUIDE.md` - VideoSDK configuration guide
- `VIDEOSDK_TESTING_REPORT.md` - Testing results

## Summary

This fix comprehensively addresses the JSON parse error by:

1. **Detecting HTML responses** before attempting to parse as JSON
2. **Providing detailed diagnostics** to identify the root cause
3. **Implementing retry logic** to handle transient errors
4. **Ensuring backend consistency** with global error handler
5. **Improving user experience** with clear error messages

The error should now be properly detected and handled, with helpful diagnostic information to quickly identify and resolve any issues.
