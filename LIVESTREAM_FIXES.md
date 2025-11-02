# Livestream Error Fixes

## Issues Fixed

### 1. RLS Policy Blocking Stream Creation
**Error**: `new row violates row-level security policy for table "live_streams"`

**Root Cause**: The RLS policy required `streamer_id = auth.uid()`, but the insert operation wasn't including `streamer_id`.

**Solution**: 
- Updated `services/supabase/streams.ts` to explicitly fetch the authenticated user and include `streamer_id` in the insert
- Created `FIX_LIVE_STREAMS_RLS.sql` to improve RLS policies with a fallback trigger

### 2. tRPC 404 Error
**Error**: `[trpc] Error response body (first 500 chars): 404 Not Found`

**Root Cause**: The client is trying to connect to the tRPC endpoint but can't find it because:
- The `.env` file is missing `EXPO_PUBLIC_RORK_API_BASE_URL`
- The tRPC client defaults to `localhost:8081` when this is missing
- The actual backend URL is in `app.json` under `extra.APP_BASE_URL`

**Solution**: Add the backend URL to `.env` file

### 3. Object Logging Issues
**Error**: `[STREAMS] Error fetching streams: [object Object]`

**Solution**: Error logging has been improved in the streams service to show actual error messages

## Setup Instructions

### Step 1: Run the RLS Fix SQL

Run the following SQL in your Supabase SQL Editor:

```sql
-- Run FIX_LIVE_STREAMS_RLS.sql
```

This will:
- Update RLS policies to be more permissive for authenticated users
- Add a trigger to automatically set `streamer_id` if not provided
- Ensure proper security while allowing stream creation

### Step 2: Update Environment Variables

Add the backend URL to your `.env` file:

```bash
# Add this line to .env
EXPO_PUBLIC_RORK_API_BASE_URL=https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app
```

Or update it to match your current backend URL from `app.json` (extra.APP_BASE_URL).

### Step 3: Restart the App

After making these changes:
1. Stop the Expo dev server
2. Clear cache if needed: `npx expo start --clear`
3. Restart the backend server (if running separately)
4. Restart the Expo app

## What Changed

### services/supabase/streams.ts
- `createStream()` now fetches the authenticated user explicitly
- Includes `streamer_id: user.id` in the insert operation
- Throws proper error if user is not authenticated

### FIX_LIVE_STREAMS_RLS.sql (New File)
- Improved RLS policies for `live_streams` table
- Added automatic `streamer_id` assignment via trigger
- Maintains security while improving developer experience

## Testing

To verify the fixes work:

1. **Test Stream Creation**:
   - Navigate to the stream page
   - Try to create a new stream
   - Should succeed without RLS errors

2. **Test Stream Fetching**:
   - View the list of live streams
   - Should see proper error messages if any issues occur

3. **Test tRPC Connection**:
   - Use any feature that calls tRPC endpoints
   - Should not see 404 errors
   - Check console for `[trpc] Fetching:` logs

## Common Issues

### Still Getting 404 Errors?
- Check that `EXPO_PUBLIC_RORK_API_BASE_URL` is set correctly in `.env`
- Verify the backend is running on the specified URL
- Check that the URL doesn't have a trailing slash

### Still Getting RLS Errors?
- Ensure you ran the SQL script in Supabase
- Check that the user is authenticated before trying to create a stream
- Verify the trigger was created: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_set_streamer_id';`

### Backend Not Starting?
- Check `backend/.env` has all required variables (AGORA_*, MINT_RTC_TOKEN_SECRET, etc.)
- Ensure port 8081 is available
- Check backend logs for startup errors
