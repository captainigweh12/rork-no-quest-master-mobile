# tRPC 404 Stale URL Fix - Complete

## Problem Summary

The app was showing tRPC 404 errors with HTML responses instead of JSON because:
- A stale URL (`https://a-...rorktest.dev/api/trpc`) was cached in AsyncStorage
- This old ephemeral tunnel URL was no longer valid
- The app was trying to reach this dead endpoint instead of the production Render URL

## Root Cause

The `EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE` key in AsyncStorage contained an outdated URL that was being used instead of the correct production URL from the environment variables.

## Solution Implemented

### 1. Enhanced `app/_layout.tsx` Bootstrap Logic

**Changes Made:**
- Made the URL clearing logic more aggressive
- Now clears ANY override that's not the Render URL or localhost
- Forces the Render URL in ALL production builds
- Added better logging to track what's happening

**Key Logic:**
```typescript
// AGGRESSIVE CLEARING: Clear any override that's not the Render URL or localhost
const isStaleUrl = currentOverride && 
  !currentOverride.includes('rork-no-quest-master-mobile.onrender.com') &&
  !currentOverride.includes('localhost') &&
  !currentOverride.includes('127.0.0.1') &&
  !currentOverride.includes('10.0.2.2');

if (isStaleUrl) {
  console.log('[baseUrl] ⚠️ Detected stale URL, clearing and setting Render URL...');
  await setBaseUrlOverride(RENDER_URL);
}

// ALWAYS force Render URL in production builds
if (!__DEV__) {
  const currentUrl = override || getBaseUrl();
  if (!currentUrl.includes('rork-no-quest-master-mobile.onrender.com')) {
    console.log('[baseUrl] 🔧 Production mode: Forcing Render URL...');
    await setBaseUrlOverride(RENDER_URL);
  }
}
```

### 2. Updated `app/clear-storage.tsx` Screen

**New Features:**
- Added "🎯 Force Set Render URL" button at the top
- This button explicitly sets the Render URL override
- Updated instructions to guide users through the quick fix
- Improved error messages and user feedback

**User Flow:**
1. User taps "Force Set Render URL"
2. App sets `EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE` to the Render URL
3. User closes and restarts the app
4. App now uses the correct production URL

## Testing Instructions

### For Users Experiencing the Issue:

1. **Open the app** (even if it's showing errors)

2. **Navigate to the Clear Storage screen:**
   - Go to Settings → API Debug
   - Or navigate directly to `/clear-storage`

3. **Tap "🎯 Force Set Render URL"**
   - Wait for the success message
   - You should see: "Render URL has been set to: https://rork-no-quest-master-mobile.onrender.com"

4. **Close the app completely:**
   - Swipe it away from recent apps
   - Don't just minimize it

5. **Restart the app:**
   - The app should now use the correct URL
   - The banner at the top (in dev mode) should show the Render URL

6. **Verify the fix:**
   - Go back to Settings → API Debug
   - Tap "Test Connection"
   - Should see: "✅ Success! Connected to https://rork-no-quest-master-mobile.onrender.com"

### For Developers:

1. **Check the logs on app startup:**
   ```
   [BaseUrlBootstrap] Starting initialization...
   [baseUrl] Loading URL override from storage...
   [baseUrl] Current cached override: <old-url>
   [baseUrl] ⚠️ Detected stale URL, clearing and setting Render URL...
   [baseUrl] ✅ Cleared stale URL and set new URL: https://rork-no-quest-master-mobile.onrender.com
   ```

2. **Verify the banner (dev mode only):**
   - Should show: `tRPC Base: https://rork-no-quest-master-mobile.onrender.com/api/trpc`

3. **Test tRPC endpoints:**
   - All tRPC calls should now return JSON
   - No more HTML 404 pages

## Files Modified

1. **app/_layout.tsx**
   - Enhanced `BaseUrlBootstrap` component
   - More aggressive stale URL detection
   - Always forces Render URL in production

2. **app/clear-storage.tsx**
   - Added `handleForceSetRenderUrl` function
   - Added "Force Set Render URL" button
   - Updated instructions for quick fix

## Prevention

The enhanced bootstrap logic will now:
- Automatically detect and clear stale URLs on app startup
- Always force the production URL in production builds
- Prevent this issue from happening again

## Environment Configuration

The correct URL is defined in:
- `env.development`: `EXPO_PUBLIC_RORK_API_BASE_URL=https://rork-no-quest-master-mobile.onrender.com`
- `env.example`: Same URL for reference

## Verification Checklist

- [x] Bootstrap logic enhanced to detect stale URLs
- [x] Production builds always force Render URL
- [x] Clear storage screen updated with quick fix button
- [x] Instructions updated for users
- [x] Logging improved for debugging
- [x] TypeScript errors fixed

## Expected Outcome

After this fix:
- ✅ App automatically clears stale URLs on startup
- ✅ Production builds always use the Render URL
- ✅ Users can manually force the correct URL via the clear storage screen
- ✅ tRPC endpoints return JSON instead of HTML 404 pages
- ✅ VideoSDK token fetch works correctly
- ✅ All API calls succeed

## Notes

- The fix is backward compatible
- Development mode still allows localhost URLs
- The override system still works for testing
- Users only need to restart the app once after the fix is deployed
