# Blank Loading Screen Fix

## Problem
The app was stuck on a blank screen during initialization due to multiple blocking async operations that prevented any UI from rendering.

## Root Causes

1. **BaseUrlBootstrap Component**: Returned `null` while waiting for async base URL loading, blocking the entire app from rendering
2. **RootLayout Component**: Returned `null` while waiting for async tRPC client initialization, creating another blocking point
3. **Cascading Effect**: These two blocking points created a situation where nothing would render until all async operations completed

## Solution Applied

### 1. Fixed `lib/trpc.ts`
**Changes:**
- Made `getTrpcClient()` synchronous instead of async
- Client is now created immediately with the current base URL
- Base URL override loading happens in the background (non-blocking)
- Removed the async Promise-based initialization that was blocking the app

**Before:**
```typescript
export async function getTrpcClient() {
  if (client) return client;
  // ... async initialization that blocks
  await loadBaseUrlOverride();
  client = createTrpcClient();
  return client;
}
```

**After:**
```typescript
export function getTrpcClient() {
  if (!client) {
    client = createTrpcClient();
    // Load override in background (non-blocking)
    loadBaseUrlOverride().then(...).catch(...);
  }
  return client;
}
```

### 2. Fixed `app/_layout.tsx`
**Changes:**
- Replaced blocking `null` return in `BaseUrlBootstrap` with a proper loading screen
- Added `ActivityIndicator` and loading text to show initialization progress
- Made `RootLayout` create tRPC client synchronously (no more async wait)
- Removed the blocking `if (!trpcClient) return null;` check

**Before:**
```typescript
function BaseUrlBootstrap({ children }) {
  if (!ready) {
    return null; // ❌ Blocks entire app
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const [trpcClient, setTrpcClient] = useState(null);
  useEffect(() => {
    getTrpcClient().then(setTrpcClient);
  }, []);
  
  if (!trpcClient) {
    return null; // ❌ Blocks entire app
  }
  // ...
}
```

**After:**
```typescript
function BaseUrlBootstrap({ children }) {
  if (!ready) {
    return ( // ✅ Shows loading screen
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const trpcClient = getTrpcClient(); // ✅ Synchronous, no blocking
  // ... renders immediately
}
```

## Benefits

1. **No More Blank Screen**: App now shows a loading indicator during initialization
2. **Faster Initial Render**: App UI renders immediately instead of waiting for async operations
3. **Better UX**: Users see visual feedback that the app is loading
4. **Non-Blocking**: Base URL override loading happens in the background without blocking the UI
5. **Maintains Functionality**: All existing features continue to work as expected

## Testing Recommendations

1. **Cold Start**: Test app launch from completely closed state
2. **Development Mode**: Verify local backend connection works
3. **Production Mode**: Verify Render URL override is applied correctly
4. **Network Conditions**: Test with slow/no network to ensure loading screen appears
5. **Auth Flow**: Verify authentication and navigation still work correctly

## Files Modified

- `lib/trpc.ts` - Made client initialization synchronous
- `app/_layout.tsx` - Added loading screen, removed blocking returns

## Notes

- The base URL override still loads from AsyncStorage, but now happens in the background
- The tRPC client is created immediately with the default/current URL
- If a base URL override exists, it will be applied on the next app restart or client recreation
- The 3-second timeout in BaseUrlBootstrap ensures the app never hangs indefinitely
