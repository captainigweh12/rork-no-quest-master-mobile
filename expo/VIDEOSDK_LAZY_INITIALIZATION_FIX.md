# VideoSDK Lazy Initialization Fix

## Problem
The app was stuck on the "Initializing..." screen because the VideoSDK context was automatically fetching authentication tokens on app startup, even when the user wasn't planning to start or join a live stream.

## Root Cause
The `VideoSDKContext` was using `trpc.videosdk.getToken.useQuery()` without the `enabled` option, causing it to automatically fetch on mount. This blocked the app initialization flow.

## Solution Applied
Made VideoSDK initialization **lazy** - it now only fetches the authentication token when the user actually needs it (when starting or joining a live stream).

### Changes Made

**File**: `contexts/VideoSDKContext.tsx`

1. **Added state to control fetching**:
   ```typescript
   const [shouldFetch, setShouldFetch] = useState(false);
   ```

2. **Made the query lazy with `enabled` option**:
   ```typescript
   const tokenQuery = trpc.videosdk.getToken.useQuery(undefined, {
     enabled: shouldFetch, // Only fetch when explicitly requested
     staleTime: 1000 * 60 * 60, // 1 hour
     // ... other options
   });
   ```

3. **Enable fetching when user creates a meeting**:
   ```typescript
   const createNewMeeting = useCallback(async () => {
     if (!shouldFetch) {
       setShouldFetch(true); // Enable token fetch
     }
     // ... rest of logic
   }, [shouldFetch, tokenQuery.data?.token, createMeetingMutation]);
   ```

4. **Enable fetching on manual retry**:
   ```typescript
   const retryTokenFetch = useCallback(() => {
     setShouldFetch(true); // Enable fetching
     tokenQuery.refetch();
   }, [tokenQuery]);
   ```

## Impact

### Before
- App would hang on "Initializing..." screen
- VideoSDK token fetch happened immediately on app startup
- Unnecessary network request even if user never uses live streaming

### After  
- App starts immediately without waiting for VideoSDK
- Token is only fetched when user actually starts/joins a live stream
- Faster app initialization
- Better user experience

## Testing
1. Run the app: `npm start`
2. App should now load past the "Initializing..." screen
3. VideoSDK token will only be fetched when you:
   - Navigate to a live streaming screen
   - Click "Start Live Stream" or "Join Live Stream"

## Files Modified
- `contexts/VideoSDKContext.tsx` - Made VideoSDK initialization lazy
- `lib/mmkvStorage.ts` - Fixed MMKV v4 API usage (separate issue)

## Related Fixes
- MMKV initialization error (see `MMKV_INITIALIZATION_FIX.md`)
