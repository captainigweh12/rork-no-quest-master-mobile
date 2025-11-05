# Guided Testing Instructions - Step by Step

## Overview
This guide will walk you through testing the tRPC 404 fix. Follow each step carefully and report the results.

---

## 🔧 Test 1: Start the Backend Server

### Step 1.1: Open a New Terminal
- Open a **new terminal window** (keep it separate from your main terminal)
- Navigate to your project directory if needed

### Step 1.2: Start the Backend
Run this command:
```bash
npm run backend
```

### Expected Output:
```
🚀 Starting backend server...

Trying method 1/3: npx tsx...

✅ Backend started successfully with: npx tsx

🚀 [Hono] Listening on: http://localhost:8081
🌐 LAN address: http://192.168.x.x:8081

[ENV CHECK]
VIDEOSDK_API_KEY present: true/false
VIDEOSDK_SECRET_KEY present: true/false
AGORA_APP_ID present: true/false
...
```

### ✅ Success Criteria:
- [ ] Server starts without errors
- [ ] Shows "Listening on: http://localhost:8081"
- [ ] No error messages

### ❌ If It Fails:
Copy the error message and report it to me.

**⚠️ IMPORTANT: Keep this terminal open! The backend must stay running for the next tests.**

---

## 🧪 Test 2: Backend Connection Test

### Step 2.1: Open Another Terminal
- Open a **second terminal window**
- Navigate to your project directory

### Step 2.2: Run the Backend Test
Run this command:
```bash
npm run test:backend
```

### Expected Output:
```
🧪 Backend Connection Test
==================================================
Base URL: http://localhost:8081

🔍 Running Tests...

📍 Testing: Root Endpoint
   URL: http://localhost:8081/
   ✅ PASSED: Status 200

📍 Testing: API Root
   URL: http://localhost:8081/api
   ✅ PASSED: Status 200

📍 Testing: Health Check
   URL: http://localhost:8081/api/health
   ✅ PASSED: Status 200

📍 Testing: tRPC Routes
   URL: http://localhost:8081/api/trpc-routes
   ✅ PASSED: Status 200

📍 Testing: VideoSDK Config Check
   URL: http://localhost:8081/api/trpc/videosdk.checkConfig
   ✅ PASSED: Status 200

📍 Testing: Example Hi Route
   URL: http://localhost:8081/api/trpc/example.hi
   ✅ PASSED: Status 200

📍 Testing: Agora Env Route
   URL: http://localhost:8081/api/trpc/agora.env
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

### ✅ Success Criteria:
- [ ] All 7 tests pass (100% success rate)
- [ ] No ECONNREFUSED errors
- [ ] All endpoints return Status 200

### ❌ If Any Test Fails:
Copy the full output and report which tests failed.

---

## 🌐 Test 3: Direct Endpoint Testing (Optional but Recommended)

### Step 3.1: Test Health Endpoint
Run this command:
```bash
curl http://localhost:8081/api/health
```

### Expected Output:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "backend": "running",
  "env": {
    "resend_configured": true/false,
    ...
  }
}
```

### ✅ Success Criteria:
- [ ] Returns JSON (not HTML)
- [ ] Status is "healthy"
- [ ] No 404 error

### Step 3.2: Test VideoSDK Config
Run this command:
```bash
curl http://localhost:8081/api/trpc/videosdk.checkConfig
```

### Expected Output:
```json
{
  "result": {
    "data": {
      "apiKeyPresent": true/false,
      "secretKeyPresent": true/false,
      "configured": true/false
    }
  }
}
```

### ✅ Success Criteria:
- [ ] Returns JSON (not HTML)
- [ ] Shows configuration status
- [ ] No 404 error

---

## 📱 Test 4: App Integration (If You Want to Test the Full Flow)

### Step 4.1: Start Your App
In a **third terminal**, run:
```bash
npm start
```

### Step 4.2: Check Console Logs
Look for these messages in the console:

### Expected Logs:
```
[TrpcProvider] Initializing tRPC client...
[tRPC] Base URL: http://localhost:8081
[tRPC] Endpoint: http://localhost:8081/api/trpc
[TrpcProvider] ✅ Client ready
```

### ✅ Success Criteria:
- [ ] No connection errors
- [ ] TrpcProvider initializes successfully
- [ ] No 404 errors
- [ ] No JSON parse errors

### ❌ If You See Errors:
Copy the error messages from the console.

---

## 🎬 Test 5: VideoSDK Token Fetch (Optional)

### Step 5.1: Navigate to Stream Page
- In your app, navigate to the stream or VideoSDK page

### Step 5.2: Check Console Logs
Look for these messages:

### Expected Logs:
```
[VideoSDK Context] Fetching token...
[VideoSDK Context] Token received: eyJhbGci...
[VideoSDK Context] ✅ Token fetch successful
```

### ✅ Success Criteria:
- [ ] Token fetch succeeds
- [ ] No 404 errors
- [ ] No JSON parse errors
- [ ] Token is in JWT format (starts with "eyJ")

### ❌ If Token Fetch Fails:
Copy the error messages from the console.

---

## 🛑 Test 6: Error Handling (Backend Stopped)

### Step 6.1: Stop the Backend
- Go to Terminal 1 (where backend is running)
- Press `Ctrl+C` to stop the backend

### Step 6.2: Try to Use the App
- In your app, try to navigate to a page that needs the backend
- Or try to fetch a VideoSDK token

### Expected Behavior:
You should see an improved error screen with:
- ⚠️ Warning icon
- "Backend Connection Failed" title
- Clear error message
- Yellow box with instructions:
  - "💡 Backend Not Running"
  - "The backend server is not running on http://localhost:8081"
  - Step-by-step instructions to start backend
- "Retry Connection" button
- "Skip for Now" button
- Current backend URL displayed

### ✅ Success Criteria:
- [ ] Error screen appears
- [ ] Instructions are clear and helpful
- [ ] Shows correct backend URL
- [ ] Retry and Skip buttons visible
- [ ] No cryptic error messages

---

## 🔄 Test 7: Error Handling (Backend Restarted)

### Step 7.1: Restart the Backend
- Go to Terminal 1
- Run: `npm run backend` again
- Wait for "Listening on: http://localhost:8081"

### Step 7.2: Click "Retry Connection"
- In your app, click the "Retry Connection" button

### Expected Behavior:
- Error screen disappears
- App reconnects successfully
- Normal functionality resumes
- No need to restart the app

### ✅ Success Criteria:
- [ ] Reconnection succeeds
- [ ] Error screen disappears
- [ ] App works normally
- [ ] No manual app restart needed

---

## 📋 Testing Checklist

After completing all tests, check off what passed:

### Critical Tests (Must Pass)
- [ ] Test 1: Backend starts successfully
- [ ] Test 2: All 7 backend tests pass (100%)
- [ ] Test 3: Direct endpoints return JSON (not HTML)

### Integration Tests (Recommended)
- [ ] Test 4: App connects to backend successfully
- [ ] Test 5: VideoSDK token fetch works

### Error Handling Tests (Optional but Good to Verify)
- [ ] Test 6: Error screen shows when backend is down
- [ ] Test 7: Reconnection works when backend restarts

---

## 📊 Report Your Results

After completing the tests, please report:

### Format:
```
Test 1 (Backend Start): ✅ PASS / ❌ FAIL
  - Notes: [any observations]

Test 2 (Backend Tests): ✅ PASS / ❌ FAIL
  - Passed: X/7
  - Failed tests: [list any that failed]

Test 3 (Direct Endpoints): ✅ PASS / ❌ FAIL
  - Notes: [any issues]

Test 4 (App Integration): ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
  - Notes: [any observations]

Test 5 (VideoSDK Token): ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
  - Notes: [any observations]

Test 6 (Error Handling - Down): ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
  - Notes: [any observations]

Test 7 (Error Handling - Restart): ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
  - Notes: [any observations]
```

---

## 🆘 Troubleshooting

### Backend Won't Start
**Error**: "Failed to start backend with all methods"

**Solution**:
```bash
npm install -D tsx
npm run backend
```

### Port Already in Use
**Error**: "address already in use" or "EADDRINUSE"

**Solution** (Windows):
```bash
netstat -ano | findstr :8081
taskkill /PID <PID> /F
npm run backend
```

### Tests Still Fail
**Error**: "ECONNREFUSED" even with backend running

**Check**:
1. Is backend actually running? (Check Terminal 1)
2. Is it on port 8081? (Check the "Listening on" message)
3. Try: `curl http://localhost:8081/api/health`

---

## ✅ Next Steps

Once all critical tests pass:
1. The tRPC 404 error is fixed!
2. You can use your app normally
3. Remember to start the backend before starting your app

---

**Ready to start? Begin with Test 1!**

Report your results after each test, and I'll help you troubleshoot any issues.
