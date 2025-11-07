# Android Loading Screen Fix

## Problem
The Android app was stuck on the loading screen indefinitely, preventing users from accessing the app.

## Root Cause
The initialization sequence in `hooks/useAppInit.ts` was calling `getBaseUrl()` synchronously without first loading the stored base URL override from AsyncStorage. This caused the following issues on Android:

1. **Storage Race Condition**: The `getBaseUrl()` function was called immediately after storage initialization, but the stored override value hadn't been loaded yet
2. **Synchronous Access to Async Data**: `getBaseUrl()` returns a cached value from `globalThis.__RORK_BASE_URL_OVERRIDE`, but this cache wasn't being populated during initialization
3. **Android-Specific Timing**: Android's AsyncStorage implementation may have additional latency compared to other platforms

## Solution
Modified the initialization sequence in `hooks/useAppInit.ts` to explicitly load the base URL override from storage before using it:

```typescript
// Step 3: Load base URL override from storage
console.log('[APP_INIT] Step 3: Loading base URL from storage...');
const { loadBaseUrlOverride, getBaseUrl } = await import('@/lib/baseUrl');
await loadBaseUrlOverride(); // Load the stored override first
const baseUrl = getBaseUrl(); // Now safely get the cached value
console.log('[APP_INIT] Base URL ready:', baseUrl, '✓');
```

## Changes Made

### `hooks/useAppInit.ts`
- Added explicit call to `loadBaseUrlOverride()` before calling `getBaseUrl()`
- Used dynamic import to ensure proper module loading order
- Added await to ensure the storage load completes before proceeding

## Key Concepts

### Storage Initialization Sequence
1. **initAppStorage()**: Initializes AsyncStorage and marks it as ready
2. **loadBaseUrlOverride()**: Loads any stored base URL override into global cache
3. **getBaseUrl()**: Returns the cached override or default value

### Why This Fix Works
- Ensures the global `__RORK_BASE_URL_OVERRIDE` cache is populated from storage before any components try to use it
- Prevents race conditions between storage initialization and value retrieval
- Maintains proper ordering of async operations during app startup

## Testing
To verify the fix works:

1. Build and install the Android APK
2. App should initialize and load past the loading screen
3. Check console logs for proper initialization sequence:
   ```
   [APP_INIT] Starting initialization sequence...
   [APP_INIT] Step 1: Initializing storage...
   [STORAGE] Starting initialization...
   [STORAGE] Available and working ✓
   [STORAGE] Initialization complete
   [APP_INIT] Storage ready ✓
   [APP_INIT] Step 2: Loading environment...
   [APP_INIT] Environment loaded ✓
   [APP_INIT] Step 3: Loading base URL from storage...
   [APP_INIT] Base URL ready: [URL] ✓
   [APP_INIT] ✅ Initialization complete - app ready
   ```

## Related Files
- `hooks/useAppInit.ts` - App initialization hook (fixed)
- `lib/storage.ts` - Storage guard implementation
- `lib/baseUrl.ts` - Base URL management with storage
- `app/_layout.tsx` - Root layout that uses AppInitializer

## Prevention
To prevent similar issues in the future:

1. Always await async storage operations before using their results
2. Never assume cached/global values are populated without explicit initialization
3. Test initialization sequences on Android specifically, as timing may differ from iOS/Web
4. Use explicit initialization steps rather than relying on implicit side effects

## Date Fixed
November 7, 2025
