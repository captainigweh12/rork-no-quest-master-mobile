# Fix Live Streaming Connection - Step by Step

## The Problem

Your app is trying to connect to `https://437eeef9b085.lhr.life` but your backend server is **not running** at that address. That's why you're getting a 404 error.

## The Solution

Follow these steps **in order**:

### Step 1: Start Backend Server

Open a **new terminal** and run:

```bash
bun backend/server.ts
```

You should see:
```
🚀 Backend starting up...
📧 RESEND_API_KEY present: true
📧 RESEND_API_KEY preview: re_...
🌍 Environment: development
[Hono] listening on http://localhost:8081
[Hono] LAN address     http://192.168.x.x:8081
```

✅ **IMPORTANT**: Keep this terminal open! Don't close it.

### Step 2: Create Tunnel (in another terminal)

Open a **second terminal** and run:

```bash
ssh -R 80:localhost:8081 nokey@localhost.run
```

You should see:
```
dc63b949bffabc.lhr.life tunneled with tls termination, https://dc63b949bffabc.lhr.life
```

📝 **Copy the HTTPS URL** - you'll need it in the next step.

Example: `https://dc63b949bffabc.lhr.life`

✅ **IMPORTANT**: Keep this terminal open too!

### Step 3: Test the Backend

Before continuing, **verify the backend is accessible through the tunnel**:

Open your browser and go to: `https://YOUR-TUNNEL-URL.lhr.life/api/health`

For example: `https://dc63b949bffabc.lhr.life/api/health`

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-03T...",
  "backend": "running"
}
```

❌ If you see a 404 or "Site Not Found", go back to Step 1 - your backend isn't running.

### Step 4: Update the App

Now go to your app's **Backend Configuration** screen (where you took the screenshot).

1. In the "Set Custom Backend URL" field, paste your tunnel URL: `https://YOUR-TUNNEL-URL.lhr.life`
2. Click **"Set URL"**
3. Click **"Test Connection"**

You should see:
- ✓ Connected
- Agora App ID: ✓ (or ✗ if not configured)
- Customer ID: ✓ (or ✗ if not configured)

### Step 5: Try Live Streaming

Now try going live:

1. Go to home screen
2. Tap the "Live" button or go to a quest and click "Go Live"
3. Grant camera permissions if asked
4. You should see the streaming interface

## Common Issues

### "503 - Tunnel Unavailable"

This means:
- Your backend is not running
- Or the tunnel was created before the backend started

**Fix**: Restart both terminals (Step 1 and 2) in the correct order.

### "No procedure found on path 'trpc/agora.env'"

This means:
- Your app is trying to connect to a URL that doesn't have your backend
- The tunnel URL is wrong

**Fix**: Make sure you followed Step 3 to verify the backend is accessible.

### Still not working?

1. Close **both terminals** (backend and tunnel)
2. Start fresh from Step 1
3. Make sure each step shows the expected output
4. Don't skip Step 3 (testing the backend)

## Why This Happens

- localhost.run creates a **tunnel** to forward requests to your local machine
- If your backend isn't running, there's nothing to forward to
- You must start the backend **before** creating the tunnel
- Each time you restart, you get a **new tunnel URL** and must update the app

## Quick Reference

**Terminal 1**: `bun backend/server.ts` (keep open)  
**Terminal 2**: `ssh -R 80:localhost:8081 nokey@localhost.run` (keep open)  
**Browser Test**: `https://YOUR-URL.lhr.life/api/health`  
**App**: Set URL → Test Connection → Go Live

---

Once both terminals are running and you've updated the app, live streaming should work! 🎉
