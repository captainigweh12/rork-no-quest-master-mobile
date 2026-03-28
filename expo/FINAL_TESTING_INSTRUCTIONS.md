# Final Testing Instructions - tRPC 404 Fix

## 🚨 Current Issues to Resolve

### Issue 1: Port 8081 Already in Use
**Error**: `EADDRINUSE: address already in use 0.0.0.0:8081`

**Solution**: Kill the process using port 8081

#### Windows PowerShell:
```powershell
# Run the kill script
.\kill-port-8081.ps1
```

#### Or manually:
```powershell
# Find the process
netstat -ano | findstr :8081

# Kill it (replace <PID> with the actual process ID)
taskkill /PID <PID> /F
```

### Issue 2: IPv6 vs IPv4 Connection
**Error**: `connect ECONNREFUSED ::1:8081`

**Solution**: Already fixed! The test script now uses `127.0.0.1` instead of `localhost`

---

## ✅ Step-by-Step Testing Process

### Step 1: Kill Any Existing Backend Process
```powershell
.\kill-port-8081.ps1
```

**Expected Output:**
```
🔍 Finding process on port 8081...
📍 Found process: PID 12345
🔪 Killing process...
✅ Process killed successfully!
```

### Step 2: Start the Backend
```bash
npm run backend
```

**Expected Output:**
```
🚀 [Hono] Listening on: http://localhost:8081
🌐 LAN address: http://10.5.0.2:8081

[ENV CHECK]
AGORA_APP_ID present: true
VIDEOSDK_API_KEY present: true
...
```

**⚠️ IMPORTANT**: Keep this terminal open! The backend must stay running.

### Step 3: Test the Backend (New Terminal)
Open a **new terminal** and run:

```bash
npm run test:backend
```

**Expected Output:**
```
🧪 Backend Connection Test
==================================================
Base URL: http://127.0.0.1:8081
Note: Using 127.0.0.1 (IPv4) to avoid IPv6 connection issues

🔍 Running Tests...

📍 Testing: Root Endpoint
   ✅ PASSED: Status 200

📍 Testing: API Root
   ✅ PASSED: Status 200

📍 Testing: Health Check
   ✅ PASSED: Status 200

📍 Testing: tRPC Routes
   ✅ PASSED: Status 200

📍 Testing: VideoSDK Config Check
   ✅ PASSED: Status 200

📍 Testing: Example Hi Route
   ✅ PASSED: Status 200

📍 Testing: Agora Env Route
   ✅ PASSED: Status 200

==================================================
📊 Test Summary
==================================================
Total Tests: 7
✅ Passed: 7
❌ Failed: 0
Success Rate: 100%

🎉 All tests passed! Backend is working correctly.
```

### Step 4: Start Your App (Optional)
In a **third terminal**:

```bash
npm start
```

The app should now connect to the backend without any tRPC 404 errors!

---

## 🔧 Troubleshooting

### Problem: "Port already in use" error persists

**Solution 1**: Use the kill script
```powershell
.\kill-port-8081.ps1
```

**Solution 2**: Restart your computer (nuclear option)

**Solution 3**: Use a different port
Edit `backend/server.ts` and change:
```typescript
const startPort = Number(process.env.PORT ?? 8082); // Changed from 8081
```

Then update `.env`:
```
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:8082
```

### Problem: Tests still fail with ECONNREFUSED

**Check 1**: Is the backend actually running?
- Look at the terminal where you ran `npm run backend`
- You should see "Listening on: http://localhost:8081"

**Check 2**: Is it listening on the right port?
- The backend should show port 8081
- The tests should connect to 127.0.0.1:8081

**Check 3**: Firewall blocking?
- Windows Firewall might be blocking Node.js
- Allow Node.js through the firewall

### Problem: Backend starts but crashes immediately

**Check the error message**:
- If it's about missing dependencies: `npm install`
- If it's about environment variables: Check your `.env` file
- If it's about TypeScript: `tsx` should be installed (we did this)

---

## 📊 Success Criteria

✅ **Backend Starts Successfully**
- No "port in use" errors
- Shows "Listening on: http://localhost:8081"
- Environment variables loaded

✅ **All Tests Pass**
- 7/7 tests pass (100% success rate)
- No ECONNREFUSED errors
- All endpoints return JSON (not HTML)

✅ **App Connects**
- No tRPC 404 errors
- No "HTML instead of JSON" errors
- VideoSDK token fetch works

---

## 🎯 What We Fixed

1. **Installed tsx** - Required to run TypeScript backend
2. **Fixed top-level await** - Removed problematic async import
3. **Fixed IPv6 issue** - Test script now uses 127.0.0.1
4. **Created kill script** - Easy way to free up port 8081
5. **Enhanced error handling** - Better error messages in app
6. **Comprehensive testing** - 7 endpoint tests

---

## 📝 Quick Reference

### Start Backend
```bash
npm run backend
```

### Test Backend
```bash
npm run test:backend
```

### Kill Port 8081
```powershell
.\kill-port-8081.ps1
```

### Start App
```bash
npm start
```

---

## 🆘 Still Having Issues?

If you're still experiencing problems after following these steps:

1. **Check the backend terminal** - Look for any error messages
2. **Check the test output** - Which specific tests are failing?
3. **Try restarting** - Close all terminals and start fresh
4. **Check your .env file** - Make sure all required variables are set

The most common issue is simply forgetting to keep the backend terminal open. The backend MUST be running for the app to work!

---

## ✅ Final Checklist

Before considering this complete, verify:

- [ ] Port 8081 is free (no "address in use" errors)
- [ ] Backend starts successfully
- [ ] All 7 tests pass (100%)
- [ ] No IPv6 connection errors
- [ ] Backend stays running (doesn't crash)
- [ ] App can connect to backend (if testing app)

Once all items are checked, the tRPC 404 error is completely fixed!
