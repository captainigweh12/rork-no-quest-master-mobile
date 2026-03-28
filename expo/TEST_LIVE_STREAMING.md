# Live Streaming Connection Issues - Debugging Guide

## Problem Summary
The live streaming feature is not working because the tRPC backend cannot be reached through the tunnel URL.

## Current Setup
- Backend running: `localhost:8081`
- Tunnel URL: `https://whole-teeth-open.loca.lt`  
- App Base URL configured: `EXPO_PUBLIC_RORK_API_BASE_URL=https://whole-teeth-open.loca.lt`
- Expected tRPC endpoint: `https://whole-teeth-open.loca.lt/api/trpc`

## Error
Getting `404 Not Found` when trying to access tRPC endpoints

## Debugging Steps

### 1. Test Backend Locally
First, verify your backend is working:

```bash
# Test root endpoint
curl http://localhost:8081/

# Test API root
curl http://localhost:8081/api

# Test tRPC health
curl http://localhost:8081/api/trpc/example.hi
```

### 2. Test Tunnel Connection
Test if your tunnel is properly forwarding:

```bash
# Test root through tunnel
curl https://whole-teeth-open.loca.lt/

# Test API through tunnel
curl https://whole-teeth-open.loca.lt/api

# Test tRPC through tunnel  
curl https://whole-teeth-open.loca.lt/api/trpc/example.hi
```

### 3. Check Tunnel Setup

Your tunnel might need specific headers. LocalTunnel sometimes shows a landing page unless you add the `bypass-tunnel-reminder` header (which your app already does).

Try this command to restart your tunnel with better settings:

```bash
# Kill existing tunnel
pkill -f "loca.lt"

# Start new tunnel (in a separate terminal)
npx localtunnel --port 8081 --subdomain whole-teeth-open
```

### 4. Alternative: Use ngrok

If localtunnel continues having issues, try ngrok instead:

```bash
# Install ngrok (one time)
# Download from https://ngrok.com/download or use:
# brew install ngrok (Mac)
# snap install ngrok (Linux)

# Start ngrok tunnel
ngrok http 8081
```

Then update your `.env`:
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://YOUR-NGROK-URL.ngrok-free.app
```

### 5. Test in App

Once tunnel is working, test in the app:

1. Open the app
2. Go to home screen  
3. Look for "Watch Live" section
4. Try to "Go Live" 
5. Check console logs for connection errors

## Common Issues

### Issue: localtunnel shows "Localtunnel is not responding" page
**Solution**: 
- Your app already includes `bypass-tunnel-reminder: true` header
- But sometimes localtunnel is flaky
- Use ngrok instead for more stable connections

### Issue: tRPC returning 404
**Check**:
- Is your backend definitely on port 8081? (look at terminal output)
- Did backend auto-switch to a different port? (e.g., 8082 if 8081 was busy)
- Update your tunnel to point to the correct port

### Issue: CORS errors
**Solution**: 
- Your hono.ts already has CORS enabled for all origins
- This should not be an issue

## Quick Fix Commands

```bash
# Terminal 1: Start backend
cd /home/user/rork-app
bun backend/server.ts

# Terminal 2: Start tunnel (use the port shown in Terminal 1)
npx localtunnel --port 8081

# Copy the tunnel URL and update .env
# Then restart your app
```

## Verification

Once everything is working, you should see:

1. Backend logs showing:
   ```
   🚀 Backend starting up...
   [Hono] listening on http://localhost:8081
   ```

2. Tunnel showing:
   ```
   your url is: https://whole-teeth-open.loca.lt
   ```

3. App console showing:
   ```
   [trpc] Base URL (dynamic): https://whole-teeth-open.loca.lt
   [trpc] Full tRPC endpoint: https://whole-teeth-open.loca.lt/api/trpc
   [trpc] Response status: 200
   ```

4. No more "404 Not Found" errors

## Testing Live Streaming

After fixing the connection:

1. Go to home screen
2. Scroll down to "Watch Live" 
3. Click "Go Live" button
4. Should show setup screen
5. Click "Go Live" to start streaming
6. Should see camera view with chat interface

If you see "Connecting to stream..." and it never connects, check:
- Supabase RLS policies for `live_streams` table
- StreamContext logs in console
- Network tab for failed requests
