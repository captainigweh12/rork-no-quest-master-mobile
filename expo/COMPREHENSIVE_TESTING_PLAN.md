# Comprehensive Testing Plan - JSON Parsing Error Fix

## Overview
This document provides a thorough testing plan to verify the JSON parsing error fix is working correctly across all scenarios.

## Pre-Testing Setup

### 1. Clear Cached Data
```bash
# Option A: Use the emergency clear screen
# Navigate to: app/emergency-clear.tsx in the running app

# Option B: Clear AsyncStorage programmatically
# Add this to a test screen and run it:
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```

### 2. Verify Backend is Running
```bash
# Test production backend
curl https://rork-no-quest-master-mobile.onrender.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","backend":"running","env":{...}}

# Test local backend (if running)
curl http://localhost:8081/api/health
```

### 3. Check Environment Variables
Verify these are set correctly:
- `EXPO_PUBLIC_RORK_API_BASE_URL` (if using override)
- Backend should have `VIDEOSDK_API_KEY`, `VIDEOSDK_SECRET_KEY`, etc.

---

## Test Suite 1: Critical Path Testing

### 1.1 Basic Connection Test
**Objective:** Verify app can connect to backend without JSON parsing errors

**Steps:**
1. Start the app: `npm start`
2. Open the app on your device/emulator
3. Observe the console logs

**Expected Results:**
```
[TrpcProvider] Initializing tRPC client...
[tRPC] Waiting for base URL to be ready...
[tRPC] Base URL ready, creating client...
[tRPC] Base URL: https://rork-no-quest-master-mobile.onrender.com
[tRPC] Endpoint: https://rork-no-quest-master-mobile.onrender.com/api/trpc
[TrpcProvider] ✅ Client ready
```

**Pass Criteria:**
- ✅ No JSON parsing errors with null bytes
- ✅ No "Unexpected token" errors
- ✅ Connection succeeds within 10 seconds
- ✅ App loads successfully

### 1.2 Simple Query Test
**Objective:** Test a basic tRPC query works correctly

**Test Code:**
```typescript
// Add this to a test screen
import { trpc } from '@/lib/trpc';

function TestScreen() {
  const { data, error, isLoading } = trpc.example.hi.useQuery();
  
  console.log('Query result:', { data, error, isLoading });
  
  return (
    <View>
      <Text>Loading: {isLoading ? 'Yes' : 'No'}</Text>
      <Text>Data: {JSON.stringify(data)}</Text>
      <Text>Error: {error?.message || 'None'}</Text>
    </View>
  );
}
```

**Expected Results:**
```
[tRPC] → https://...onrender.com/api/trpc/example.hi GET
[tRPC] ← 200 https://...onrender.com/api/trpc/example.hi
Query result: { data: { greeting: "Hello from tRPC!" }, error: null, isLoading: false }
```

**Pass Criteria:**
- ✅ Query completes successfully
- ✅ Data is properly deserialized
- ✅ No JSON parsing errors
- ✅ Response is typed correctly

### 1.3 Error Response Test
**Objective:** Verify error responses are handled properly

**Test Code:**
```typescript
// Test with an invalid query that should fail
const { data, error } = trpc.nonexistent.query.useQuery();
```

**Expected Results:**
- ✅ Error is caught and typed properly
- ✅ No JSON parsing errors with null bytes
- ✅ Error message is user-friendly
- ✅ App doesn't crash

---

## Test Suite 2: Backend Endpoint Testing

### 2.1 Health Endpoint Test
```bash
curl -v https://rork-no-quest-master-mobile.onrender.com/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "backend": "running",
  "env": {
    "resend_configured": true,
    "resend_api_key_preview": "re_..."
  }
}
```

**Pass Criteria:**
- ✅ Returns 200 status
- ✅ JSON is valid
- ✅ All fields present

### 2.2 tRPC Routes Diagnostic
```bash
curl https://rork-no-quest-master-mobile.onrender.com/api/trpc-routes
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "routes": {
    "example": { "hi": "query" },
    "agora": { "env": "query", "token": "query" },
    "videosdk": { ... }
  }
}
```

**Pass Criteria:**
- ✅ All routes listed
- ✅ JSON is valid
- ✅ Routes match app-router.ts

### 2.3 Example.hi Query Test
```bash
curl -X POST https://rork-no-quest-master-mobile.onrender.com/api/trpc/example.hi \
  -H "Content-Type: application/json" \
  -d '{"json":null}'
```

**Expected Response:**
```json
{
  "result": {
    "data": {
      "json": {
        "greeting": "Hello from tRPC!"
      }
    }
  }
}
```

**Pass Criteria:**
- ✅ Returns 200 status
- ✅ Response uses superjson format
- ✅ Data is properly serialized

### 2.4 Agora Routes Test
```bash
# Test agora.env
curl -X POST https://rork-no-quest-master-mobile.onrender.com/api/trpc/agora.env \
  -H "Content-Type: application/json" \
  -d '{"json":null}'

# Test agora.token
curl -X POST https://rork-no-quest-master-mobile.onrender.com/api/trpc/agora.token \
  -H "Content-Type: application/json" \
  -d '{"json":{"channelName":"test","uid":12345}}'
```

**Pass Criteria:**
- ✅ Both endpoints respond
- ✅ No JSON parsing errors
- ✅ Proper error handling if env vars missing

### 2.5 VideoSDK Routes Test
```bash
# Test videosdk.checkConfig
curl -X POST https://rork-no-quest-master-mobile.onrender.com/api/trpc/videosdk.checkConfig \
  -H "Content-Type: application/json" \
  -d '{"json":null}'

# Test videosdk.getToken
curl -X POST https://rork-no-quest-master-mobile.onrender.com/api/trpc/videosdk.getToken \
  -H "Content-Type: application/json" \
  -d '{"json":null}'
```

**Pass Criteria:**
- ✅ Config check returns status
- ✅ Token generation works (if configured)
- ✅ Proper error messages if not configured

---

## Test Suite 3: Edge Cases & Error Scenarios

### 3.1 Backend Offline Test
**Steps:**
1. Stop the backend server
2. Try to connect from the app

**Expected Results:**
```
[TrpcProvider] ❌ Initialization timeout after 10s
Error: Connection timeout. The backend may be starting up or unreachable.
```

**Pass Criteria:**
- ✅ Shows timeout error after 10s
- ✅ Error message is user-friendly
- ✅ No JSON parsing errors
- ✅ App doesn't crash

### 3.2 Invalid Base URL Test
**Steps:**
1. Set invalid base URL override
2. Try to connect

**Test Code:**
```typescript
import { setBaseUrlOverride } from '@/lib/baseUrl';
await setBaseUrlOverride('https://invalid-url-that-does-not-exist.com');
```

**Expected Results:**
- ✅ Shows network error
- ✅ Error message mentions connection failure
- ✅ No JSON parsing errors

### 3.3 Slow Network Test
**Steps:**
1. Use network throttling (Chrome DevTools or similar)
2. Set to "Slow 3G"
3. Try to connect

**Expected Results:**
- ✅ Waits up to 10s before timeout
- ✅ Shows loading indicator
- ✅ Eventually connects or times out gracefully

### 3.4 CORS Error Test
**Steps:**
1. Try to connect from an unauthorized origin
2. Check browser console

**Expected Results:**
- ✅ CORS error is caught
- ✅ Error message is clear
- ✅ No JSON parsing errors

### 3.5 Malformed Response Test
**Objective:** Verify transformer handles edge cases

**Test Scenarios:**
- Empty response body
- Non-JSON response
- HTML error page (404, 500)
- Response with special characters
- Response with dates (should use superjson)

**Pass Criteria:**
- ✅ All scenarios handled gracefully
- ✅ No null bytes in error messages
- ✅ Proper error types returned

---

## Test Suite 4: Transformer Testing

### 4.1 Date Serialization Test
**Test Code:**
```typescript
// Backend should return a date
const { data } = trpc.someQuery.useQuery();
console.log('Date type:', data?.someDate instanceof Date);
```

**Pass Criteria:**
- ✅ Dates are properly deserialized as Date objects
- ✅ Not strings
- ✅ Timezone preserved

### 4.2 Complex Object Test
**Test Code:**
```typescript
// Test with nested objects, arrays, dates, etc.
const complexData = {
  date: new Date(),
  nested: { array: [1, 2, 3] },
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3])
};
```

**Pass Criteria:**
- ✅ All types preserved through serialization
- ✅ No data loss
- ✅ Proper deserialization

---

## Test Suite 5: Platform-Specific Testing

### 5.1 iOS Testing
**Steps:**
1. Run on iOS simulator: `npm run ios`
2. Run all critical path tests
3. Check for iOS-specific issues

**Pass Criteria:**
- ✅ All tests pass on iOS
- ✅ No platform-specific errors

### 5.2 Android Testing
**Steps:**
1. Run on Android emulator: `npm run android`
2. Run all critical path tests
3. Test with 10.0.2.2 base URL

**Pass Criteria:**
- ✅ All tests pass on Android
- ✅ 10.0.2.2 works for local backend
- ✅ No platform-specific errors

### 5.3 Web Testing
**Steps:**
1. Run on web: `npm run web`
2. Run all critical path tests
3. Check browser console

**Pass Criteria:**
- ✅ All tests pass on web
- ✅ No CORS issues
- ✅ No web-specific errors

---

## Test Suite 6: Load & Performance Testing

### 6.1 Multiple Concurrent Requests
**Test Code:**
```typescript
// Fire multiple queries simultaneously
const queries = [
  trpc.example.hi.useQuery(),
  trpc.agora.env.useQuery(),
  trpc.videosdk.checkConfig.useQuery(),
];
```

**Pass Criteria:**
- ✅ All queries complete successfully
- ✅ No race conditions
- ✅ Proper batching (if enabled)

### 6.2 Rapid Sequential Requests
**Test Code:**
```typescript
for (let i = 0; i < 10; i++) {
  await trpc.example.hi.query();
}
```

**Pass Criteria:**
- ✅ All requests succeed
- ✅ No memory leaks
- ✅ Performance acceptable

### 6.3 Large Payload Test
**Test Code:**
```typescript
// Test with large data
const largeArray = Array(1000).fill({ data: 'test' });
const result = await trpc.someMutation.mutate({ data: largeArray });
```

**Pass Criteria:**
- ✅ Large payloads handled correctly
- ✅ No timeout errors
- ✅ Proper serialization

---

## Test Suite 7: Integration Testing

### 7.1 Full App Flow Test
**Steps:**
1. Start app
2. Navigate through all screens
3. Trigger all tRPC queries
4. Test all mutations

**Screens to Test:**
- [ ] Home/Tabs
- [ ] Profile
- [ ] Settings
- [ ] Admin (if applicable)
- [ ] Stream screens
- [ ] Teams
- [ ] Any screen using tRPC

**Pass Criteria:**
- ✅ All screens load
- ✅ All queries work
- ✅ All mutations work
- ✅ No JSON parsing errors anywhere

### 7.2 Authentication Flow Test
**Steps:**
1. Test login
2. Test authenticated queries
3. Test logout
4. Test unauthorized access

**Pass Criteria:**
- ✅ Auth works correctly
- ✅ Tokens handled properly
- ✅ Unauthorized errors handled

---

## Test Results Template

### Test Execution Log

```
Date: [DATE]
Tester: [NAME]
Environment: [Production/Development]
Platform: [iOS/Android/Web]

Test Suite 1: Critical Path Testing
✅ 1.1 Basic Connection Test - PASS
✅ 1.2 Simple Query Test - PASS
✅ 1.3 Error Response Test - PASS

Test Suite 2: Backend Endpoint Testing
✅ 2.1 Health Endpoint Test - PASS
✅ 2.2 tRPC Routes Diagnostic - PASS
✅ 2.3 Example.hi Query Test - PASS
✅ 2.4 Agora Routes Test - PASS
✅ 2.5 VideoSDK Routes Test - PASS

Test Suite 3: Edge Cases
✅ 3.1 Backend Offline Test - PASS
✅ 3.2 Invalid Base URL Test - PASS
✅ 3.3 Slow Network Test - PASS
✅ 3.4 CORS Error Test - PASS
✅ 3.5 Malformed Response Test - PASS

Test Suite 4: Transformer Testing
✅ 4.1 Date Serialization Test - PASS
✅ 4.2 Complex Object Test - PASS

Test Suite 5: Platform-Specific Testing
✅ 5.1 iOS Testing - PASS
✅ 5.2 Android Testing - PASS
✅ 5.3 Web Testing - PASS

Test Suite 6: Load & Performance Testing
✅ 6.1 Multiple Concurrent Requests - PASS
✅ 6.2 Rapid Sequential Requests - PASS
✅ 6.3 Large Payload Test - PASS

Test Suite 7: Integration Testing
✅ 7.1 Full App Flow Test - PASS
✅ 7.2 Authentication Flow Test - PASS

Overall Result: ALL TESTS PASSED ✅
```

---

## Known Issues & Limitations

### Current Limitations:
1. Backend cold start on Render may take 10-30 seconds
2. Free tier Render may have rate limits
3. Network errors depend on user's connection

### Monitoring:
- Check console logs for any warnings
- Monitor backend logs on Render
- Watch for any new error patterns

---

## Rollback Plan

If issues are found:

```bash
# Rollback the changes
git checkout HEAD~1 lib/trpc.ts providers/TrpcProvider.tsx

# Or restore specific files
git restore lib/trpc.ts
git restore providers/TrpcProvider.tsx
```

---

## Success Criteria

The fix is considered successful if:
- ✅ No JSON parsing errors with null bytes occur
- ✅ All tRPC queries work correctly
- ✅ Error responses are handled properly
- ✅ Transformer works for all data types
- ✅ All platforms work (iOS, Android, Web)
- ✅ Performance is acceptable
- ✅ No regressions in existing functionality
