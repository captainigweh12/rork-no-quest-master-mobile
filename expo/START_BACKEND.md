# Quick Backend Start Commands

## Terminal 1: Start Backend
```bash
cd backend
bun run server.ts
```

**Expected output:**
```
🚀 Backend starting up...
📧 RESEND_API_KEY present: true
[Hono] listening on http://localhost:8081
```

Keep this terminal open!

---

## Terminal 2: Start Tunnel
```bash
ssh -R 80:localhost:8081 nokey@localhost.run
```

**Expected output:**
```
dc63b949bffabc.lhr.life tunneled with tls termination, https://dc63b949bffabc.lhr.life
```

**Copy the HTTPS URL** (e.g., `https://dc63b949bffabc.lhr.life`)

Keep this terminal open!

---

## Update .env File

Open `.env` in the **project root** and update:

```bash
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-tunnel-url.lhr.life
```

Replace with your actual tunnel URL from Terminal 2.

---

## Restart Expo

In your Expo terminal:
1. Press `Ctrl+C` to stop
2. Run: `bun start`

---

## Verify It's Working

### Test 1: Check Backend Health
Open browser: `https://your-tunnel-url.lhr.life/api/health`

Should see:
```json
{
  "status": "healthy",
  "backend": "running"
}
```

### Test 2: Check tRPC Base URL
Look at the dev banner at the top of your app. It should show:
```
tRPC Base: https://your-tunnel-url.lhr.life/api/trpc
```

### Test 3: Try Live Streaming
1. Go to home screen
2. Click "Go Live"
3. Grant camera permissions
4. Should see streaming interface (not stuck on loading)

---

## Troubleshooting

**Backend won't start?**
- Port 8081 might be in use
- Check if another process is using it: `lsof -i :8081`
- Kill it: `kill -9 <PID>`

**Tunnel not working?**
- Make sure backend started **first**
- Each tunnel URL is unique and temporary
- Must update `.env` every time you restart the tunnel

**Still seeing tRPC errors?**
- Make sure all 3 steps are done (backend, tunnel, .env update)
- Restart Expo after updating `.env`
- Check the dev banner shows correct URL
- Check browser can reach `/api/health` endpoint
