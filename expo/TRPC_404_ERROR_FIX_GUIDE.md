# tRPC 404 Error Fix Guide

## Problem Summary

You're experiencing tRPC errors where the server returns HTML (404 page) instead of JSON:

```
[tRPC] ❌ Server returned non-JSON response
[tRPC] Status: 404
[tRPC] Content-Type: text/html; charset=utf-8
[VideoSDK Context] Token fetch error: TRPCClientError: Unable to transform response from server
```

## Root Cause Analysis

After comprehensive testing, I've determined:

✅ **Backend is working perfectly:**
- Deployed on Render at: `https://rork-no-quest-master-mobile.onrender.com`
- Health check endpoint: WORKING (`/api/health`)
- tRPC endpoints: WORKING (`/api/trpc/videosdk.getToken`)
- Returning proper JSON responses

❌ **Problem is client-side:**
- The app has a **stale/incorrect URL cached** in AsyncStorage
- This cached URL is overriding the correct URL from `.env`
- The cached URL points to a non-existent or incorrect server that returns HTML 404s

## The Fix

### Option 1: Use the Built-in Fix Tool (Recommended)

I've created a diagnostic screen that will help you fix this issue:

1. **Navigate to the fix screen** in your app:
   ```
   Open URL: /fix-trpc-404
   ```

2. **Follow the on-screen instructions:**
   - Tap "Test Connection" to verify the issue
   - Tap "Clear Cached URL" to remove stale URLs
   - Tap "Restart App" and close/reopen the app
   - Test again to verify the fix

3. **What the tool does:**
   - Shows current base URL configuration
   - Identifies if AsyncStorage has a cached override
   - Tests connectivity to the backend
   - Clears stale URLs from cache
   - Forces app to use the correct URL from `.env`

### Option 2: Manual Fix via Clear Storage Screen

If you can't access the fix-trpc-404 screen:

1. Navigate to `/clear-storage` or `/emergency-clear`
2. Tap "Clear All Storage"
3. Restart the app

### Option 3: Command Line Fix

Run this Node.js script to clear AsyncStorage:

```javascript
// clear-async-storage.js
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearStaleUrl() {
  try {
    await AsyncStorage.removeItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
    console.log('✅ Cleared stale URL from AsyncStorage');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearStaleUrl();
```

## Verification

After applying the fix, verify it worked:

### 1. Check Console Logs

Look for this log message when the app starts:
```
🌐 Using default Base URL: https://rork-no-quest-master-mobile.onrender.com
   (No AsyncStorage override set)
```

### 2. Test Backend Connection

The app should successfully:
- Fetch VideoSDK tokens
- Create meetings
- No more 404 errors in console

### 3. Manual Verification

Test the backend directly:

```bash
# Test health check
curl https://rork-no-quest-master-mobile.onrender.com/api/health

# Test tRPC endpoint
curl https://rork-no-quest-master-mobile.onrender.com/api/trpc/videosdk.getToken
```

Both should return JSON responses (not HTML).

## Why This Happened

The app's `baseUrl.ts` system has two URL sources:

1. **`.env` file** (EXPO_PUBLIC_RORK_API_BASE_URL) - The correct production URL
2. **AsyncStorage cache** (override) - Allows temporary URL changes for testing

When you previously tested with different backend URLs (like localhost or old deployed URLs), those URLs got cached in AsyncStorage. This cache persists even after changing the `.env` file.

The caching system was designed to help with development, but in this case, it's causing the app to use a stale URL that no longer exists or doesn't have the tRPC routes properly configured.

## Technical Details

### Current Configuration

**Expected URL (from .env):**
```
https://rork-no-quest-master-mobile.onrender.com
```

**tRPC Endpoint:**
```
https://rork-no-quest-master-mobile.onrender.com/api/trpc
```

### URL Priority

The app resolves the base URL in this order:
1. AsyncStorage override (if set) - **HIGHEST PRIORITY**
2. EXPO_PUBLIC_RORK_API_BASE_URL from .env
3. Expo hostUri (development)
4. Default localhost (127.0.0.1:8081 or 10.0.2.2:8081 for Android)

### The Fix Tool

The `app/fix-trpc-404.tsx` screen provides:

- **Current URL Display**: See what URL the app is actually using
- **Override Detection**: Identifies if AsyncStorage has a cached URL
- **Connection Testing**: Verifies backend is accessible
- **Cache Clearing**: Removes stale URLs
- **Diagnostics**: Detailed error messages to help debug

## Prevention

To prevent this issue in the future:

1. **Always use the Clear Cache tool** when switching between development and production
2. **Check console logs** on startup to see which URL is being used
3. **Use the backend-config screen** (if available) to verify/change URLs
4. **Restart the app** after changing .env files

## Backend Status

✅ **Currently Deployed and Working:**
- URL: `https://rork-no-quest-master-mobile.onrender.com`
- Health: Healthy
- tRPC: All routes functional
- VideoSDK: Token generation working

The backend is properly configured with:
- CORS for all origins in development
- JSON error responses (not HTML)
- Proper tRPC endpoint at `/api/trpc`
- Health check at `/api/health`

## Need More Help?

If the issue persists after trying all fixes:

1. Check your internet connection
2. Verify the Render deployment is not sleeping (cold start)
3. Check browser/Postman to confirm backend is accessible
4. Look for more detailed error messages in console
5. Try completely reinstalling the app

## Summary

**The problem:** Stale URL cached in AsyncStorage  
**The solution:** Clear AsyncStorage cache  
**The tool:** Use `/fix-trpc-404` screen  
**The result:** App uses correct Render URL from `.env`

The backend is working perfectly - this is purely a client-side caching issue that needs to be cleared.
