# 🚀 Quick Start: Fix tRPC 404 Error

## The Problem
Your app is showing these errors:
```
[tRPC] ❌ Server returned HTML instead of JSON
[tRPC] Status: 404
[VideoSDK Context] Token fetch error: JSON Parse error
```

## The Solution (3 Steps)

### Step 1: Start the Backend 🖥️

Open a **new terminal** and run:

```bash
npm run backend
```

**Wait for this message:**
```
🚀 [Hono] Listening on: http://localhost:8081
```

✅ **Keep this terminal open!** The backend must stay running.

---

### Step 2: Verify It's Working ✓

In **another terminal**, run:

```bash
npm run test:backend
```

**You should see:**
```
✅ Passed: 7
❌ Failed: 0
Success Rate: 100%
🎉 All tests passed!
```

---

### Step 3: Restart Your App 📱

1. Stop your Expo app (Ctrl+C)
2. Start it again:
   ```bash
   npm start
   ```

**The errors should be gone!** ✨

---

## Alternative: Using Bun

If you have Bun installed:

```bash
npm run backend:bun
```

---

## Troubleshooting

### "Port 8081 already in use"
Something else is using port 8081. Find and kill it:

**Windows:**
```bash
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -i :8081
kill -9 <PID>
```

### "Module not found" errors
Install dependencies:
```bash
npm install
```

### Backend starts but tests fail
Wait a few seconds for the backend to fully initialize, then run tests again.

---

## What's Happening?

The tRPC client in your app tries to connect to `http://localhost:8081/api/trpc`, but if the backend server isn't running, it gets a 404 HTML error page instead of JSON.

**Before Fix:**
```
App → http://localhost:8081/api/trpc → ❌ 404 HTML
```

**After Fix:**
```
App → http://localhost:8081/api/trpc → ✅ JSON Response
```

---

## For Production

If deploying to production (e.g., Render):

1. Backend will auto-start on Render
2. Update `.env` with your backend URL:
   ```
   EXPO_PUBLIC_RORK_API_BASE_URL=https://your-backend.onrender.com
   ```
3. Restart your app

---

## Need More Help?

See detailed documentation:
- `TRPC_404_FIX_COMPLETE_SUMMARY.md` - Full fix summary
- `TRPC_404_COMPREHENSIVE_DIAGNOSIS.md` - Detailed diagnosis
- `START_BACKEND.md` - Backend setup guide

---

**That's it!** Your tRPC errors should be fixed. 🎉
