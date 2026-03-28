# VideoSDK Configuration Analysis

## Executive Summary

After thorough analysis of the VideoSDK configuration, I've identified **several critical issues** that need to be addressed:

---

## 🔴 Critical Issues Found

### 1. **Duplicate tRPC Client Definitions**

**Problem:** There are TWO different tRPC client implementations that conflict with each other:

#### Client A: In `app/_layout.tsx` (Lines 26-37)
```typescript
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${process.env.EXPO_PUBLIC_API_URL}/api/trpc`,  // ❌ WRONG URL
      async headers() {
        return {
          "bypass-tunnel-reminder": "true",
        };
      },
      transformer
    })
  ]
});
```

**Issues:**
- Uses `EXPO_PUBLIC_API_URL` which defaults to `http://localhost:3000` (WRONG PORT - backend runs on 8081)
- Does NOT use the `getBaseUrl()` helper that handles platform-specific URLs
- Exported as `trpcClient` and used in VideoSDKContext

#### Client B: In `lib/trpc.ts` (Lines 11-48)
```typescript
function createTrpcClient() {
  const baseUrl = getBaseUrl();  // ✅ CORRECT - uses proper base URL logic
  const TRPC_URL = `${baseUrl}/api/trpc`;
  
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: TRPC_URL,
        transformer: superjson,
        // ... proper error handling
      })
    ]
  });
}
```

**Issues:**
- This is the CORRECT implementation but it's NOT being used by VideoSDKContext
- Only used by `TrpcProvider.tsx` which is NOT in the provider tree

**Impact:** VideoSDKContext is using the wrong client pointing to the wrong URL, causing 404 errors.

---

### 2. **Wrong Environment Variable in _layout.tsx**

**Problem:** Line 14 in `app/_layout.tsx`:
```typescript
if (!process.env.EXPO_PUBLIC_API_URL) {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';  // ❌ WRONG PORT
}
```

**Should be:**
```typescript
if (!process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
  process.env.EXPO_PUBLIC_RORK_API_BASE_URL = 'http://localhost:8081';  // ✅ CORRECT
}
```

**Impact:** The app defaults to port 3000 instead of 8081 where the backend actually runs.

---

### 3. **VideoSDKContext Uses Wrong Import**

**Problem:** In `contexts/VideoSDKContext.tsx` (Line 3):
```typescript
import { trpcClient } from "@/lib/trpc";
```

But `lib/trpc.ts` does NOT export `trpcClient` - it only exports:
- `trpc` (the React hooks)
- `getTrpcClient()` (async function)

The `trpcClient` being imported is actually coming from `app/_layout.tsx` which has the wrong configuration.

**Impact:** VideoSDK is using a misconfigured client pointing to the wrong URL.

---

### 4. **TrpcProvider Not in Provider Tree**

**Problem:** `providers/TrpcProvider.tsx` exists and uses the correct client setup, but it's NOT included in the provider tree in `app/_layout.tsx`.

The provider tree shows:
```typescript
<trpc.Provider client={trpcClient} queryClient={queryClient}>  // ❌ Wrong client
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      ...
      <VideoSDKContextProvider>  // Uses wrong trpcClient
```

**Should be:**
```typescript
<TrpcProvider>  // ✅ Uses correct client from lib/trpc.ts
  <AuthProvider>
    ...
    <VideoSDKContextProvider>
```

---

### 5. **Missing VideoSDK Environment Variables in env.example**

**Problem:** The `env.example` file does NOT include VideoSDK credentials:
```
# Missing from env.example:
VIDEOSDK_API_KEY=your-videosdk-api-key
VIDEOSDK_SECRET_KEY=your-videosdk-secret-key
```

**Impact:** New developers won't know these variables are required.

---

### 6. **Endpoint Authorization Header Mismatch**

**Problem:** In `backend/trpc/routes/videosdk/route.ts`:

Line 40 (createVideoSDKMeeting):
```typescript
headers: {
  Authorization: token,  // ✅ Correct
  "Content-Type": "application/json",
}
```

Line 58 (validateVideoSDKMeeting):
```typescript
headers: {
  authorization: token,  // ⚠️ Lowercase 'a'
  "Content-Type": "application/json",
}
```

**Impact:** While HTTP headers are case-insensitive, inconsistency can cause issues with some proxies/middleware.

---

## 🟡 Minor Issues

### 7. **Inconsistent Token Generation Logic**

There are TWO implementations of token generation:

1. **backend/services/videosdk.ts** - Uses `roles: ["CRAWLER"]`
2. **backend/trpc/routes/videosdk/route.ts** - Does NOT include roles

**Recommendation:** Consolidate to use the service file implementation.

---

### 8. **BaseUrlBootstrap Proactively Sets Render URL**

**Problem:** In `app/_layout.tsx` lines 88-92:
```typescript
if (!override) {
  console.log('[baseUrl] No override found; proactively setting Render URL override...');
  await setBaseUrlOverride(RENDER_URL);
  console.log('[baseUrl] ✅ Set proactive override to:', RENDER_URL);
}
```

**Impact:** This forces ALL users to use the Render deployment, even for local development. Developers need to manually clear this to test locally.

**Recommendation:** Only set Render URL in production builds, not development.

---

## ✅ What's Working Correctly

1. **Backend VideoSDK Router** - Properly configured with all required endpoints
2. **Backend Server** - Correctly loads environment variables from both root and backend/.env
3. **VideoSDK API Endpoints** - Using correct VideoSDK API URLs (https://api.videosdk.live/v2/rooms)
4. **Error Handling** - Good error messages in VideoSDKContext
5. **Environment Checks** - Backend logs presence of required env vars on startup

---

## 🔧 Recommended Fixes (Priority Order)

### Priority 1: Fix tRPC Client Configuration

**Option A: Use lib/trpc.ts client everywhere (RECOMMENDED)**

1. Remove the duplicate client from `app/_layout.tsx`
2. Update VideoSDKContext to use the hooks from `trpc` instead of direct client
3. Add TrpcProvider to the provider tree

**Option B: Fix the _layout.tsx client**

1. Update `app/_layout.tsx` to use `getBaseUrl()` instead of `EXPO_PUBLIC_API_URL`
2. Export it properly from lib/trpc.ts

### Priority 2: Fix Environment Variable

Update `app/_layout.tsx` line 14:
```typescript
if (!process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
  process.env.EXPO_PUBLIC_RORK_API_BASE_URL = 'http://localhost:8081';
}
```

### Priority 3: Add VideoSDK Vars to env.example

Add to `env.example`:
```
# VideoSDK (for live streaming)
VIDEOSDK_API_KEY=your-videosdk-api-key
VIDEOSDK_SECRET_KEY=your-videosdk-secret-key
```

### Priority 4: Standardize Authorization Header

Change line 60 in `backend/trpc/routes/videosdk/route.ts`:
```typescript
Authorization: token,  // Capital A
```

### Priority 5: Consolidate Token Generation

Remove duplicate implementation from `backend/services/videosdk.ts` or update the router to use it.

### Priority 6: Fix BaseUrlBootstrap Logic

Only set Render URL override in production:
```typescript
if (!override && !__DEV__) {
  await setBaseUrlOverride(RENDER_URL);
}
```

---

## 🧪 Testing Checklist

After fixes are applied:

- [ ] Backend starts successfully with env vars loaded
- [ ] `curl http://localhost:8081/api/health` returns 200
- [ ] `curl http://localhost:8081/api/trpc-routes` shows videosdk routes
- [ ] App connects to correct backend URL (check console logs)
- [ ] VideoSDK token generation works (check VideoSDKContext logs)
- [ ] Meeting creation works
- [ ] No 404 errors in console

---

## 📝 Root Cause Summary

The primary issue is **architectural confusion** between two different tRPC client setups:

1. An older implementation in `app/_layout.tsx` using wrong env vars
2. A newer, correct implementation in `lib/trpc.ts` that's not being used

The VideoSDK functionality is trying to use the old client, resulting in 404 errors because it's pointing to `localhost:3000` instead of `localhost:8081` (or the Render URL in production).

**Solution:** Consolidate to use the correct client from `lib/trpc.ts` throughout the app.
