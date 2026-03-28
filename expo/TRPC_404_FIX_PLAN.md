# tRPC 404 Error Fix Plan

## Problem Analysis

The app is showing tRPC 404 errors with HTML responses instead of JSON because:

1. **Stale URL in AsyncStorage**: The app has a cached override URL pointing to `https://a-...rorktest.dev/api/trpc` (an old ephemeral tunnel)
2. **Correct URL**: Should be `https://rork-no-quest-master-mobile.onrender.com`
3. **Root Cause**: The `app/_layout.tsx` has logic to detect and clear `rorktest.dev` URLs, but it may not be working correctly or the override is being set elsewhere

## Current Configuration

### Environment Files
- `env.development`: Contains `EXPO_PUBLIC_RORK_API_BASE_URL=https://rork-no-quest-master-mobile.onrender.com` ✅
- `env.example`: Contains the same correct URL ✅

### Base URL Logic (`lib/baseUrl.ts`)
- Reads from `EXPO_PUBLIC_RORK_API_BASE_URL` env var
- Can be overridden via AsyncStorage key `EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE`
- Falls back to localhost/Android emulator URLs if no env var

### Bootstrap Logic (`app/_layout.tsx`)
- Has code to detect and clear `rorktest.dev` URLs
- Sets Render URL in production mode
- **Issue**: May not be aggressive enough in clearing the stale override

## Fix Strategy

### Phase 1: Strengthen Override Clearing
1. Make the `BaseUrlBootstrap` more aggressive in clearing stale URLs
2. Always force the Render URL in production builds
3. Add better logging to track what's happening

### Phase 2: Update Clear Storage Screen
1. Make the clear storage screen more user-friendly
2. Add a button to force set the Render URL
3. Improve error messages

### Phase 3: Testing & Verification
1. Test the fix with the app
2. Verify the correct URL is being used
3. Confirm tRPC endpoints are accessible

## Implementation Steps

1. ✅ Update `app/_layout.tsx` to be more aggressive about clearing stale URLs
2. ✅ Update `app/clear-storage.tsx` to add a "Force Set Render URL" button
3. ✅ Create a test script to verify the fix
4. ✅ Document the fix and testing instructions

## Expected Outcome

After the fix:
- App will always use `https://rork-no-quest-master-mobile.onrender.com` in production
- Stale `rorktest.dev` URLs will be automatically cleared
- Users can manually force the correct URL via the clear storage screen
- tRPC endpoints will return JSON instead of HTML 404 pages
