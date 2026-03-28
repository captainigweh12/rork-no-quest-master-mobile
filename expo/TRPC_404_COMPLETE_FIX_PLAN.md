# tRPC 404 Error - Complete Fix Plan

## Problem Identified
✅ **Root Cause**: Backend server is not running
- The tRPC client is trying to connect to `http://localhost:8081/api/trpc`
- No server is listening on port 8081
- This causes 404 HTML responses instead of JSON

## Solution Overview

### Immediate Fix (Manual)
1. Start the backend server
2. Verify it's running
3. Test the connection

### Long-term Improvements
1. Add backend start scripts to package.json
2. Improve error messages in the app
3. Add backend health check before tRPC initialization
4. Add development mode indicators

## Implementation Plan

### Phase 1: Add Backend Start Scripts ✅
**File**: `package.json`
- Add `backend` script to start server
- Add `backend:dev` script with watch mode
- Add `dev` script to run both frontend and backend

### Phase 2: Improve Error Handling ✅
**File**: `providers/TrpcProvider.tsx`
- Detect backend not running (connection refused)
- Show helpful error message with backend start instructions
- Add "Start Backend" button that opens instructions

### Phase 3: Add Backend Health Check ✅
**File**: `lib/trpc.ts`
- Add health check before creating tRPC client
- Retry with exponential backoff
- Show connection status

### Phase 4: Add Development Indicators ✅
**File**: `app/_layout.tsx`
- Add backend status indicator in dev mode
- Show current base URL
- Add quick access to backend controls

### Phase 5: Create Comprehensive Test Script ✅
**File**: `test-backend-connection.js`
- Test backend health endpoint
- Test tRPC routes
- Test VideoSDK endpoints
- Provide clear diagnostics

## Files to Modify

1. ✅ `package.json` - Add backend scripts
2. ✅ `providers/TrpcProvider.tsx` - Improve error handling
3. ✅ `lib/trpc.ts` - Add health check
4. ✅ `app/_layout.tsx` - Add status indicator
5. ✅ `test-backend-connection.js` - Create test script
6. ✅ `README.md` - Update with backend instructions

## Testing Checklist

### Backend Tests
- [ ] Backend starts successfully on port 8081
- [ ] Health endpoint returns 200 OK
- [ ] tRPC routes endpoint returns route list
- [ ] VideoSDK checkConfig returns config status

### Client Tests
- [ ] App detects backend is down
- [ ] Error message shows backend start instructions
- [ ] App connects successfully when backend is running
- [ ] VideoSDK token fetch works
- [ ] No 404 or JSON parse errors

### Integration Tests
- [ ] Start backend → App connects automatically
- [ ] Stop backend → App shows error
- [ ] Restart backend → App reconnects
- [ ] Change base URL → App uses new URL

## Success Criteria

✅ Backend can be started with simple command
✅ App shows clear error when backend is down
✅ App connects automatically when backend is up
✅ VideoSDK token fetch works without errors
✅ No more 404 or JSON parse errors
✅ Development experience is smooth

## Next Steps

1. Implement Phase 1: Add backend scripts
2. Implement Phase 2: Improve error handling
3. Implement Phase 3: Add health check
4. Implement Phase 4: Add dev indicators
5. Implement Phase 5: Create test script
6. Test all scenarios
7. Update documentation
