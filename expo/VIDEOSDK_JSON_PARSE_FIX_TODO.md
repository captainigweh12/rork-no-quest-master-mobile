# VideoSDK JSON Parse Error Fix - TODO

## Problem
Error: `[VideoSDK Context] Token fetch error: TRPCClientError: JSON Parse error: Unexpected character: <`

This indicates the server is returning HTML instead of JSON, likely a 404 or error page.

## Tasks

### 1. Enhance tRPC Client Error Handling
- [x] Add response Content-Type validation
- [x] Log actual response body on parse errors
- [x] Detect HTML responses and provide clear error messages
- [x] Add error pattern detection (404, 502, CORS)

### 2. Improve VideoSDK Context Error Handling
- [x] Add retry logic with exponential backoff (3 retries, 1s/2s/4s delays)
- [x] Provide more detailed error messages
- [x] Add better error state management
- [x] Add manual retry function
- [x] Detect specific error types (JSON parse, 404, network, CORS, timeout)

### 3. Add Backend Error Handling
- [x] Ensure all errors return proper JSON
- [x] Add global error handling middleware
- [x] Improve error logging

### 4. Testing
- [ ] Test VideoSDK token fetch
- [ ] Verify error messages are clear
- [ ] Confirm backend route accessibility
- [ ] Test retry logic
- [ ] Verify HTML detection works

## Progress
✅ All implementation tasks completed!
⏳ Ready for testing

## Files Modified
1. ✅ `lib/trpc.ts` - Enhanced fetch wrapper with HTML detection
2. ✅ `contexts/VideoSDKContext.tsx` - Added retry logic and better error messages
3. ✅ `backend/hono.ts` - Added global error handler
