# tRPC 404 Error Fix - TODO

## Problem
Client receives HTML "Site Not Found" page instead of JSON from tRPC endpoints, resulting in:
- Status: 404
- Content-Type: text/html
- Error: Server returned HTML instead of JSON

## Root Causes Identified
1. Missing catch-all 404 handler in Hono (returns HTML by default)
2. Potential wrong base URL (stale AsyncStorage override or incorrect env)
3. Need better debugging tools to identify URL issues

## Fix Plan

### ✅ Phase 1: Backend Fixes
- [x] Add catch-all JSON 404 handler to backend/hono.ts
- [x] Add tRPC route existence verification endpoint (/api/test-trpc)
- [x] Improve error logging

### ✅ Phase 2: Client Fixes
- [x] Enhance base URL logging in lib/baseUrl.ts
- [x] Add startup URL verification in lib/trpc.ts (already had good logging)
- [x] Improve error messages with actionable suggestions (already in place)

### ✅ Phase 3: Diagnostic Tools
- [x] Create deployment verification script (test-trpc-404-fix.js)
- [x] Add base URL testing utility (included in verification script)
- [x] Create troubleshooting guide (TRPC_404_FIX_GUIDE.md)

### ✅ Phase 4: Testing & Documentation
- [ ] Test local backend (user needs to run: `bun backend/server.ts`)
- [ ] Test Render deployment (user needs to redeploy)
- [x] Document troubleshooting steps
- [x] Create quick-fix checklist
=======

## Implementation Steps
1. ✅ Fix backend to always return JSON
2. ✅ Add better logging and diagnostics
3. ✅ Create verification tools
4. ⏳ Test and document (awaiting user testing)

## Files Modified

### Backend
- ✅ `backend/hono.ts` - Added catch-all 404 handler and /api/test-trpc endpoint

### Client
- ✅ `lib/baseUrl.ts` - Enhanced logging to show which URL is being used

### Documentation & Testing
- ✅ `TRPC_404_FIX_GUIDE.md` - Comprehensive troubleshooting guide
- ✅ `test-trpc-404-fix.js` - Verification script to test endpoints
- ✅ `TRPC_404_FIX_TODO.md` - This file (tracking progress)

## Next Steps for User

1. **Test Locally:**
   ```bash
   # Terminal 1: Start backend
   bun backend/server.ts
   
   # Terminal 2: Run verification
   node test-trpc-404-fix.js http://localhost:8081
   ```

2. **Deploy to Render:**
   - Commit and push changes
   - Render will auto-deploy
   - Wait for deployment to complete

3. **Test Render Deployment:**
   ```bash
   node test-trpc-404-fix.js
   ```

4. **Test in App:**
   - Clear AsyncStorage: Navigate to /clear-storage
   - Restart app
   - Check logs for base URL
   - Try VideoSDK features

5. **If Still Having Issues:**
   - Read TRPC_404_FIX_GUIDE.md
   - Check which URL the app is using
   - Verify backend is accessible
   - Run verification script
