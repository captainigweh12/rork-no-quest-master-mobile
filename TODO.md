# Fix JSON Parsing Error with Null Bytes - TODO

## Root Cause
The custom fetch wrapper in `lib/trpc.ts` is throwing errors before tRPC can parse responses, causing null bytes in JSON error.

## Tasks

- [x] 1. Fix lib/trpc.ts - Remove problematic fetch wrapper
  - [x] Remove the `!res.ok` check that consumes response body
  - [x] Let tRPC handle all HTTP errors through its own error handling
  - [x] Keep logging and header injection only

- [x] 2. Enhance error handling in TrpcProvider.tsx
  - [x] Add more detailed error messages
  - [x] Improve timeout handling (increased to 10s for Render cold starts)
  - [x] Better error message categorization

- [ ] 3. Test the fix
  - [ ] Verify tRPC queries work properly
  - [ ] Check error responses are handled correctly
  - [ ] Test with backend on Render

## Progress
- Started: [Current timestamp]
- Status: ✅ COMPLETE - Ready for testing
- Main fix applied to lib/trpc.ts
- Enhanced error handling in TrpcProvider.tsx
- Comprehensive documentation created (JSON_PARSING_ERROR_FIX.md)

## Next Steps for User
1. Clear any cached base URL overrides (use app/emergency-clear.tsx)
2. Ensure backend is running on Render
3. Restart the app and test the connection
4. Verify tRPC queries work without JSON parsing errors
