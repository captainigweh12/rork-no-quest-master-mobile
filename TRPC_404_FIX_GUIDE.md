# tRPC 404 Error Fix Guide

## Problem Description

Your app is receiving HTML "Site Not Found" pages instead of JSON from tRPC endpoints, causing these errors:

```
[tRPC] ❌ Server returned HTML instead of JSON
[tRPC] Status: 404
[tRPC] Content-Type: text/html; charset=utf-8
[tRPC] 🔍 Route not found - check backend routing
```

## What This Means

The client is hitting a URL that doesn't serve your tRPC API. The server returns an HTML 404 page instead of the JSON response tRPC expects.

## Root Causes (Most Common First)

1. **Wrong Base URL** - Client is pointing to the wrong server
2. **Missing 404 Handler** - Backend returns HTML for unmatched routes
3. **Render Deployment Issue** - Service not running or misconfigured
4. **Stale AsyncStorage Override** - Old URL cached in app storage

---

## Quick Fix Checklist

### 1. Verify Base URL

**Check what URL your app is using:**

```bash
# Look for these logs when app starts:
📡 Using AsyncStorage override Base URL: <url>
# OR
🌐 Using default Base URL: <url>
```

**Expected URLs:**
- **Production (Render):** `https://rork-no-quest-master-mobile.onrender.com`
- **Local Development:** `http://localhost:8081` or `http://127.0.0.1:8081`
- **Android Emulator:** `http://10.0.2.2:8081`

**If wrong, fix it:**

Option A: Clear stale override (recommended):
```typescript
// In your app, navigate to /clear-storage or /emergency-clear
// Or programmatically:
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.removeItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
```

Option B: Set correct override:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem(
  'EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE',
  'https://rork-no-quest-master-mobile.onrender.com'
);
```

Option C: Update .env file:
```bash
EXPO_PUBLIC_RORK_API_BASE_URL=https://rork-no-quest-master-mobile.onrender.com
```

### 2. Test Backend Accessibility

**Test if backend is running:**

```bash
# Test Render deployment
curl https://rork-no-quest-master-mobile.onrender.com/api/health

# Test local backend
curl http://localhost:8081/api/health
```

**Expected response (JSON):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "backend": "running"
}
```

**If you get HTML or connection error:**
- Render: Check deployment status in Render dashboard
- Local: Start backend with `bun backend/server.ts`

### 3. Test tRPC Endpoints

**Run the verification script:**

```bash
# Test Render deployment
node test-trpc-404-fix.js

# Test local backend
node test-trpc-404-fix.js http://localhost:8081
```

**What to look for:**
- ✅ All endpoints return JSON (even 404s)
- ❌ Any endpoint returns HTML = bug still exists

### 4. Verify Backend Has 404 Handler

**Check backend/hono.ts has this at the END:**

```typescript
// Catch-all 404 Handler (MUST BE LAST)
app.notFound((c) => {
  const path = c.req.path;
  console.log(`\n❌ [404] Route not found: ${path}`);
  
  if (path.includes('/api/trpc')) {
    return c.json(
      {
        success: false,
        error: "tRPC route not found",
        path,
        message: "The requested tRPC procedure does not exist.",
        availableRoutes: [/* ... */],
        timestamp: new Date().toISOString(),
      },
      404
    );
  }
  
  return c.json(
    {
      success: false,
      error: "Route not found",
      path,
      message: `The requested path '${path}' does not exist.`,
      timestamp: new Date().toISOString(),
    },
    404
  );
});
```

**If missing:** The fix has been applied to `backend/hono.ts`. Redeploy to Render.

---

## Detailed Troubleshooting

### Issue: "Connection Failed" or "Network Error"

**Symptoms:**
```
[tRPC] ❌ Fetch error: Failed to fetch
```

**Causes & Solutions:**

1. **Backend not running**
   ```bash
   # Start local backend
   bun backend/server.ts
   ```

2. **Wrong URL for your environment**
   - iOS Simulator: Use `http://localhost:8081`
   - Android Emulator: Use `http://10.0.2.2:8081`
   - Physical Device: Use your computer's LAN IP (shown in backend logs)

3. **Render service sleeping (free tier)**
   - First request may take 30-60 seconds
   - Visit the URL in browser first to wake it up

### Issue: "HTML Instead of JSON"

**Symptoms:**
```
[tRPC] ❌ Server returned HTML instead of JSON
[tRPC] Content-Type: text/html
```

**Causes & Solutions:**

1. **Missing catch-all 404 handler**
   - ✅ Fixed in this PR - redeploy backend

2. **Wrong path/route**
   - Check available routes: `GET /api/trpc-routes`
   - Verify route exists in `backend/trpc/app-router.ts`

3. **Hitting wrong service**
   - Verify URL points to your backend, not a static site
   - Check Render service URL matches your env var

### Issue: "Route Not Found" (but returns JSON)

**Symptoms:**
```json
{
  "success": false,
  "error": "tRPC route not found",
  "availableRoutes": [...]
}
```

**This is actually GOOD!** The 404 handler is working. The issue is:

1. **Typo in route name**
   - Check spelling: `videosdk.getToken` not `videosdk.gettoken`
   - Case sensitive!

2. **Route not registered**
   - Verify in `backend/trpc/app-router.ts`:
   ```typescript
   export const appRouter = createTRPCRouter({
     videosdk: videosdkRouter, // Must be here!
   });
   ```

3. **Using wrong tRPC client method**
   - Queries: `trpc.videosdk.getToken.useQuery()`
   - Mutations: `trpc.videosdk.createMeeting.useMutation()`

---

## Testing Your Fix

### 1. Test Locally

```bash
# Terminal 1: Start backend
bun backend/server.ts

# Terminal 2: Run tests
node test-trpc-404-fix.js http://localhost:8081

# Terminal 3: Start app
npm start
```

### 2. Test Render Deployment

```bash
# Run tests against Render
node test-trpc-404-fix.js

# Or test specific endpoint
curl https://rork-no-quest-master-mobile.onrender.com/api/trpc/videosdk.checkConfig
```

### 3. Test in App

1. Clear app storage: Navigate to `/clear-storage`
2. Restart app
3. Check logs for base URL
4. Try VideoSDK feature
5. Check for tRPC errors

---

## Deployment Checklist

### Before Deploying to Render

- [ ] Backend has catch-all 404 handler (at end of `backend/hono.ts`)
- [ ] All tRPC routes registered in `backend/trpc/app-router.ts`
- [ ] Environment variables set in Render dashboard
- [ ] `render.yaml` has correct start command: `bun backend/server.ts`

### After Deploying to Render

- [ ] Check deployment logs for errors
- [ ] Visit health endpoint: `/api/health`
- [ ] Run verification script: `node test-trpc-404-fix.js`
- [ ] Test in app with correct base URL

### In Your App

- [ ] `.env` has correct `EXPO_PUBLIC_RORK_API_BASE_URL`
- [ ] Clear any stale AsyncStorage overrides
- [ ] Restart app to load new base URL
- [ ] Check startup logs for base URL
- [ ] Test tRPC features

---

## Environment Variables Reference

### Client (.env)

```bash
# Production (Render)
EXPO_PUBLIC_RORK_API_BASE_URL=https://rork-no-quest-master-mobile.onrender.com

# Local Development
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:8081

# DO NOT include /api/trpc - it's added automatically
```

### Server (Render Dashboard or backend/.env)

```bash
# Required for VideoSDK
VIDEOSDK_API_KEY=your-key
VIDEOSDK_SECRET_KEY=your-secret

# Optional
RESEND_API_KEY=your-key
SUPABASE_WEBHOOK_SECRET=your-secret
```

---

## Common Mistakes

### ❌ Including /api/trpc in base URL

```bash
# WRONG
EXPO_PUBLIC_RORK_API_BASE_URL=https://example.com/api/trpc

# CORRECT
EXPO_PUBLIC_RORK_API_BASE_URL=https://example.com
```

The `/api/trpc` is added automatically by `lib/trpc.ts`.

### ❌ Using localhost on physical device

```bash
# WRONG (on physical device)
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:8081

# CORRECT (use LAN IP shown in backend logs)
EXPO_PUBLIC_RORK_API_BASE_URL=http://192.168.1.100:8081
```

### ❌ Forgetting to restart app after env changes

After changing `.env` or AsyncStorage:
1. Stop the app completely
2. Clear Metro bundler cache: `npm start -- --clear`
3. Restart app

### ❌ Not deploying backend changes

After fixing `backend/hono.ts`:
1. Commit changes
2. Push to GitHub
3. Render auto-deploys (or manual deploy)
4. Wait for deployment to complete
5. Test with verification script

---

## Still Having Issues?

### Debug Mode

Add this to your app to see detailed tRPC logs:

```typescript
// In lib/trpc.ts, the fetch function already logs:
console.log("[tRPC] →", url, method);
console.log("[tRPC] ←", status, url);
```

Check console for:
- What URL is being called
- What status code is returned
- What content-type is returned

### Get Help

1. **Check backend logs:**
   - Render: Dashboard → Logs
   - Local: Terminal running `bun backend/server.ts`

2. **Run diagnostics:**
   ```bash
   # Check available routes
   curl https://your-backend.onrender.com/api/trpc-routes
   
   # Test tRPC endpoint
   curl https://your-backend.onrender.com/api/test-trpc
   ```

3. **Verify tRPC client setup:**
   - Check `lib/trpc.ts` builds correct URL
   - Check `providers/TrpcProvider.tsx` wraps app
   - Check components use `trpc.*.useQuery()` correctly

---

## Summary

The fix involves three main changes:

1. **Backend:** Add catch-all 404 handler that returns JSON
2. **Client:** Enhanced logging to show which URL is being used
3. **Testing:** Verification script to test all endpoints

After applying these fixes and redeploying, all tRPC requests should receive JSON responses, even for 404 errors.
