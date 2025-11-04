# VideoSDK 404 Fix - Complete Guide

## Problem Summary
The app was pointing to `https://dev-c23bcbuqrsjmkdoaxiu6y.rorktest.dev` which doesn't have the backend running. The backend runs locally at `http://localhost:8081`.

## What Was Fixed

### 1. Updated `.env` file
Changed from:
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://dev-c23bcbuqrsjmkdoaxiu6y.rorktest.dev
```

To:
```
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:8081
```

### 2. Added Storage Clear Utility
Created `/app/clear-storage.tsx` to clear any cached base URL overrides.

### 3. Added Diagnostic Endpoint
Added `/api/trpc-routes` endpoint to verify all tRPC routes are registered.

## Testing Steps

### Step 1: Start the Backend
```bash
cd backend
bun run server.ts
```

You should see:
```
🚀 [Hono] Listening on: http://localhost:8081
[ENV CHECK]
VIDEOSDK_API_KEY present: true
VIDEOSDK_SECRET_KEY present: true
```

### Step 2: Test Health Check
```bash
curl http://localhost:8081/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "backend": "running",
  "env": { ... }
}
```

### Step 3: Test Route Registration
```bash
curl http://localhost:8081/api/trpc-routes
```

Expected response:
```json
{
  "status": "ok",
  "routes": {
    "videosdk": {
      "getToken": "query",
      "createMeeting": "mutation",
      "validateMeeting": "query",
      "checkConfig": "query"
    }
  },
  "env_check": {
    "videosdk_api_key": true,
    "videosdk_secret_key": true
  }
}
```

### Step 4: Test VideoSDK Config
```bash
curl 'http://localhost:8081/api/trpc/videosdk.checkConfig'
```

Expected response (tRPC format):
```json
{
  "result": {
    "data": {
      "json": {
        "apiKeyPresent": true,
        "secretKeyPresent": true,
        "configured": true
      }
    }
  }
}
```

### Step 5: Test Token Generation
```bash
curl 'http://localhost:8081/api/trpc/videosdk.getToken'
```

Expected response:
```json
{
  "result": {
    "data": {
      "json": {
        "token": "eyJhbGc..."
      }
    }
  }
}
```

### Step 6: Clear App Cache
```bash
# Clear Metro bundler cache
rm -rf .expo .expo-shared
npx expo start -c
```

### Step 7: Clear AsyncStorage
In the app:
1. Navigate to `/clear-storage`
2. Tap "Clear All Storage & Override"
3. Restart the app

### Step 8: Verify App Connection
In the app console, you should see:
```
[trpc] Creating client with base URL: http://localhost:8081
[trpc] Full tRPC endpoint: http://localhost:8081/api/trpc
[VideoSDK Context] Token generated successfully
```

## For Mobile Device Testing

If testing on a real device (not simulator/emulator):

### Option 1: Use HTTPS Tunnel
```bash
# In a separate terminal
npx localtunnel --port 8081
```

Then update `.env`:
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-tunnel-url.lhr.life
```

### Option 2: Use LAN IP
Find your LAN IP:
```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4
```

Update `.env`:
```
EXPO_PUBLIC_RORK_API_BASE_URL=http://192.168.x.x:8081
```

## Platform-Specific URLs

The `lib/baseUrl.ts` handles platform-specific fallbacks:
- **Web**: Uses env var or `http://127.0.0.1:8081`
- **Android Emulator**: Uses `http://10.0.2.2:8081` (emulator's host machine)
- **iOS Simulator**: Uses `http://127.0.0.1:8081`
- **Real Devices**: Must use tunnel or LAN IP

## Troubleshooting

### Still Getting 404?
1. Verify backend is running: `curl http://localhost:8081/api/health`
2. Check env is loaded: Look for "[trpc] Creating client with base URL:" in console
3. Clear AsyncStorage: Visit `/clear-storage` in app
4. Restart Metro: `rm -rf .expo && npx expo start -c`

### Backend Not Starting?
1. Check port 8081 is free: `lsof -i :8081` (Mac/Linux)
2. Verify env vars: Check `backend/.env` has VIDEOSDK keys
3. Check logs for errors in server startup

### Token Generation Fails?
1. Verify env vars: `curl http://localhost:8081/api/trpc-routes`
2. Should show `"videosdk_api_key": true`
3. Check backend console for errors

## Next Steps

Once all tests pass:
1. Test the streaming UI at `/stream-videosdk`
2. Verify token is fetched successfully
3. Test meeting creation
4. Test joining a meeting

## Production Deployment

When deploying to production:
1. Deploy backend to a stable URL (e.g., `https://api.rejectionhero.com`)
2. Update production `.env` with that URL
3. Ensure CORS is configured for your production domain
4. Set up proper environment variables on your hosting platform
