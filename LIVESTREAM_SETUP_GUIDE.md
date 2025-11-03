# Live Streaming Setup Guide

## Issue
The live streaming feature shows loading spinner because it cannot reach the backend tRPC API.

## Solution

### 1. Start the Backend Server

Open a **new terminal** and run:
```bash
cd backend
bun run server.ts
```

You should see output like:
```
🚀 Backend starting up...
[Hono] listening on http://localhost:8081
```

**Keep this terminal running!**

### 2. Create a Tunnel to the Backend

Open **another new terminal** and create a tunnel:

```bash
ssh -R 80:localhost:8081 nokey@localhost.run
```

You'll see output with your tunnel URL, something like:
```
dc63b949bffabc.lhr.life tunneled with tls termination, https://dc63b949bffabc.lhr.life
```

Copy the **full HTTPS URL** (e.g., `https://dc63b949bffabc.lhr.life`)

**Keep this terminal running too!**

### 3. Update the Environment Variable

Update the `.env` file in the **project root** with your tunnel URL:

```bash
# In .env file
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-tunnel-url.lhr.life
```

Replace `https://your-tunnel-url.lhr.life` with the actual tunnel URL from step 2.

### 4. Restart the Expo App

1. Stop the Expo server (Ctrl+C)
2. Restart it:
```bash
bun start
```

## Verification

To verify the backend is working:

1. Open your browser
2. Go to: `https://your-tunnel-url.lhr.life/api/health`
3. You should see: `{"status":"healthy",...}`

## Testing Live Streaming

1. In the app, go to the home screen
2. Click "Go Live" button (in the "No channels are live" section)
3. Grant camera permissions
4. Click "Go Live" again
5. You should now see the camera view with streaming interface

## Troubleshooting

### Backend not starting?
- Check if port 8081 is already in use
- The server will try ports 8082, 8083, etc. automatically
- Make sure you have `backend/.env` file with Agora credentials

### Tunnel not working?
- The tunnel URL changes every time you restart it
- Always update `.env` with the new tunnel URL
- Make sure to use the HTTPS URL, not HTTP

### Still showing loading spinner?
- Check the console logs for tRPC errors
- Verify the base URL by looking at the dev banner at top of screen
- The banner shows: `tRPC Base: https://...`
- This should match your tunnel URL

### 404 errors?
- The backend must be running **before** you start the tunnel
- Tunnel should point to `localhost:8081` (or whichever port the server is using)

## Notes

- The backend and tunnel must stay running while testing
- Each time you restart the tunnel, you get a new URL
- You must update `.env` and restart Expo when the URL changes
- For production, you'd deploy the backend to a permanent URL
