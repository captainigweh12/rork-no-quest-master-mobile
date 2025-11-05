# Clear Storage & Stale URL Fix - Implementation TODO

## Tasks Completed ✅

### 1. Fix lib/baseUrl.ts ✅
- [x] Add `isStaleUrl()` function to detect rorkset.dev and other stale URLs
- [x] Add `clearStaleUrlIfNeeded()` function for automatic clearing
- [x] Enhance logging for stale URL detection

### 2. Fix providers/TrpcProvider.tsx ✅
- [x] Use new `isStaleUrl()` function via `clearStaleUrlIfNeeded()`
- [x] Add explicit rorkset.dev detection
- [x] Improve logging and error messages
- [x] Simplified stale URL detection logic

### 3. Fix app/clear-storage.tsx ✅
- [x] Add stale URL detection display on mount
- [x] Add dedicated "Clear Stale rorkset.dev URL" button
- [x] Improve user feedback with warning section
- [x] Add visual indicators for stale URLs (red text, warning banner)
- [x] Dynamic instructions based on stale URL detection

### 4. Verify app/_layout.tsx
- [x] Confirmed TrpcProvider is properly used (no duplicates found)
- [x] TrpcProvider wraps the entire app correctly

## Current Status: ✅ Implementation Complete

## What Was Fixed:

1. **lib/baseUrl.ts**
   - Added `isStaleUrl()` to detect URLs containing 'rorkset.dev' or 'rorktest.dev'
   - Added `clearStaleUrlIfNeeded()` to automatically clear stale URLs
   - Enhanced logging to show when stale URLs are detected

2. **providers/TrpcProvider.tsx**
   - Now uses `clearStaleUrlIfNeeded()` on app startup
   - Automatically clears rorkset.dev URLs and sets the correct Render URL
   - Improved logging to show when stale URLs are cleared

3. **app/clear-storage.tsx**
   - Detects stale URLs on screen mount
   - Shows prominent warning banner when stale URL is detected
   - Added dedicated "Clear Stale rorkset.dev URL" button
   - Visual indicators (red text) for stale URLs
   - Dynamic instructions based on whether stale URL is present

## Testing Steps:

1. **Test Stale URL Detection:**
   - Manually set a rorkset.dev URL in AsyncStorage
   - Open the app - should auto-detect and clear it
   - Navigate to /clear-storage - should show warning if detected

2. **Test Clear Storage Button:**
   - Navigate to /clear-storage
   - If stale URL detected, tap "Clear Stale rorkset.dev URL"
   - Verify success message and app restart prompt

3. **Test Production Mode:**
   - Build production app
   - Verify it always uses https://rork-no-quest-master-mobile.onrender.com
   - Verify stale URLs are automatically cleared

## Next Steps:
- Test the implementation with actual stale URLs
- Verify app startup clears stale URLs automatically
- Test the clear storage UI with and without stale URLs
- Deploy and monitor for any issues
