# tRPC 404 Error - Comprehensive Diagnosis

## Error Summary
The application is experiencing tRPC 404 errors where the server returns HTML instead of JSON, specifically when trying to access `/api/trpc/videosdk.getToken`.

## Error Messages
```
[tRPC] ❌ Server returned HTML instead of JSON
[tRPC] Status: 404
[tRPC] Content-Type: text/html; charset=utf-8
[tRPC] 🔍 Route not found - check backend routing
[VideoSDK Context] Token fetch error: TRPCClientError: JSON Parse error: Unexpected character: <
```

## Root Cause Analysis

### 1. **Backend Server Not Running**
   - **Most Likely Cause**: The backend server (`backend/server.ts`) is not running
   - **Evidence**: 404 HTML response indicates no server is handling the request
   - **Impact**: All tRPC routes return 404

### 2. **Incorrect Base URL Configuration**
   - **Possible Cause**: The client is pointing to the wrong backend URL
   - **Check**: `EXPO_PUBLIC_RORK_API_BASE_URL` in `.env` file
   - **Default**: Falls back to `http://127.0.0.1:8081` or `http://10.0.2.2:8081` (Android)

### 3. **Port Mismatch**
   - **Possible Cause**: Backend running on different port than client expects
   - **Check**: Backend starts on port 8081 by default, but may use 8082+ if port is busy

### 4. **Network/Tunnel Issues**
   - **Possible Cause**: If using tunnel (localhost.run), tunnel may be down or misconfigured
   - **Check**: Tunnel URL in `.env` must match active tunnel

## File Analysis

### Backend Configuration (✅ Correct)
- **File**: `backend/hono.ts`
- **tRPC Mount Point**: `/api/trpc/*` with `endpoint: '/api/trpc'`
- **Router**: Properly configured with `videosdk` routes
- **404 Handler**: Returns JSON (not HTML) for tRPC routes

### Router Configuration (✅ Correct)
- **File**: `backend/trpc/app-router.ts`
- **VideoSDK Router**: Properly exported as `videosdk: videosdkRouter`
- **Routes Available**:
  - `videosdk.getToken` (query)
  - `videosdk.createMeeting` (mutation)
  - `videosdk.validateMeeting` (query)
  - `videosdk.checkConfig` (query)

### Client Configuration (✅ Correct)
- **File**: `lib/trpc.ts`
- **Endpoint**: `${baseUrl}/api/trpc`
- **Transformer**: `superjson` (matches backend)
- **Error Handling**: Properly detects HTML responses

### Base URL Logic (✅ Correct)
- **File**: `lib/baseUrl.ts`
- **Priority**:
  1. AsyncStorage override
  2. `EXPO_PUBLIC_RORK_API_BASE_URL` env var
  3. Expo hostUri
  4. Platform defaults (127.0.0.1:8081 or 10.0.2.2:8081)

## Diagnosis Steps

### Step 1: Verify Backend is Running
```bash
# Check if backend process is running
# Windows:
netstat -ano | findstr :8081

# Expected: Should show LISTENING on port 8081
```

### Step 2: Test Backend Directly
```bash
# Test health endpoint
curl http://localhost:8081/api/health

# Expected: {"status":"healthy","backend":"running",...}
```

### Step 3: Test tRPC Routes
```bash
# Test tRPC routes listing
curl http://localhost:8081/api/trpc-routes

# Expected: JSON with available routes including videosdk.getToken
```

### Step 4: Test VideoSDK Route Directly
```bash
# Test videosdk.checkConfig
curl http://localhost:8081/api/trpc/videosdk.checkConfig

# Expected: JSON response (not HTML 404)
```

### Step 5: Check Client Base URL
- Open app and check console logs for:
  ```
  📡 Using AsyncStorage override Base URL: ...
  OR
  🌐 Using default Base URL: ...
  ```

## Fix Strategy

### Fix 1: Start Backend Server (PRIMARY FIX)
```bash
# Navigate to backend directory
cd backend

# Start server with bun
bun run server.ts

# OR start with node
node --loader tsx server.ts
```

### Fix 2: Verify Environment Variables
```bash
# Check .env file has correct backend URL
# If using tunnel:
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-tunnel-url.lhr.life

# If using local:
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:8081
```

### Fix 3: Clear AsyncStorage Override (if needed)
- If base URL override is cached incorrectly:
  1. Navigate to `/emergency-clear` in app
  2. Clear AsyncStorage
  3. Restart app

### Fix 4: Add Backend Start Script to package.json
- Add convenience script to start backend from root:
```json
"scripts": {
  "backend": "cd backend && bun run server.ts",
  "backend:dev": "cd backend && bun run --watch server.ts"
}
```

## Testing Plan

### Test 1: Backend Health Check
```bash
curl http://localhost:8081/api/health
# Expected: 200 OK with JSON
```

### Test 2: tRPC Routes Check
```bash
curl http://localhost:8081/api/trpc-routes
# Expected: 200 OK with routes list
```

### Test 3: VideoSDK Config Check
```bash
curl http://localhost:8081/api/trpc/videosdk.checkConfig
# Expected: 200 OK with config status
```

### Test 4: Client Connection
- Open app
- Check console for:
  - `[tRPC] Base URL: http://localhost:8081`
  - `[tRPC] Endpoint: http://localhost:8081/api/trpc`
  - No 404 errors

### Test 5: VideoSDK Token Fetch
- Navigate to stream page
- Check console for:
  - `[VideoSDK Context] Fetching token...`
  - `[VideoSDK Context] Token received: ...`
  - No JSON parse errors

## Prevention Measures

### 1. Add Backend Health Check to App Startup
- Check backend availability before initializing tRPC
- Show clear error message if backend is unreachable

### 2. Add Backend Status Indicator
- Show backend connection status in dev mode
- Display current base URL in debug panel

### 3. Improve Error Messages
- Detect 404 errors and suggest starting backend
- Provide link to backend start instructions

### 4. Add Backend Auto-Start (Optional)
- Consider adding backend auto-start to Expo dev script
- Use concurrently or similar tool to run both together

## Next Steps

1. ✅ Verify backend is running on port 8081
2. ✅ Test backend endpoints directly with curl
3. ✅ Check client base URL configuration
4. ✅ Test tRPC connection from app
5. ✅ Verify VideoSDK token fetch works
6. ✅ Document backend startup in README
7. ✅ Add convenience scripts to package.json

## Conclusion

The 404 error is most likely caused by the backend server not running. The tRPC configuration, routing, and client setup are all correct. Once the backend is started, all routes should work properly.

**Primary Action Required**: Start the backend server using `cd backend && bun run server.ts`
