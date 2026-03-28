# VideoSDK Testing Instructions - Windows PowerShell

## Prerequisites

Before testing, ensure you have:
- ✅ Bun runtime installed (or Node.js with tsx)
- ✅ VideoSDK API credentials in `backend/.env`
- ✅ All dependencies installed (`npm install` or `bun install`)

---

## Step 1: Start the Backend Server

Open a **new PowerShell terminal** and run:

```powershell
# Navigate to backend directory
cd backend

# Start the server with bun
bun run server.ts

# OR if you don't have bun, use tsx:
# npx tsx server.ts
```

**Expected Output:**
```
🚀 [Hono] Listening on: http://localhost:8081
[ENV CHECK]
VIDEOSDK_API_KEY present: true
VIDEOSDK_SECRET_KEY present: true
```

**✅ Success Criteria:**
- Server starts without errors
- Port 8081 is listening
- VideoSDK environment variables are detected

**❌ If it fails:**
- Check if port 8081 is already in use
- Verify `backend/.env` has VIDEOSDK_API_KEY and VIDEOSDK_SECRET_KEY
- Check for any missing dependencies

---

## Step 2: Test Health Endpoint

Open a **second PowerShell terminal** and run:

```powershell
# Test health endpoint
curl http://localhost:8081/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "backend": "running",
  "env": {
    "VIDEOSDK_API_KEY": true,
    "VIDEOSDK_SECRET_KEY": true
  }
}
```

**✅ Success Criteria:**
- Status is "healthy"
- VideoSDK keys are present (true)

**❌ If it fails:**
- Verify backend is running (Step 1)
- Check firewall isn't blocking port 8081

---

## Step 3: Test tRPC Routes Registration

```powershell
# List all registered tRPC routes
curl http://localhost:8081/api/trpc-routes
```

**Expected Response:**
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

**✅ Success Criteria:**
- All 4 VideoSDK routes are listed
- Environment variables are present

**❌ If it fails:**
- Check backend console for errors
- Verify `backend/trpc/routes/videosdk/route.ts` exists

---

## Step 4: Test VideoSDK Configuration Check

```powershell
# Check VideoSDK configuration
curl 'http://localhost:8081/api/trpc/videosdk.checkConfig'
```

**Expected Response (tRPC format):**
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

**✅ Success Criteria:**
- All three values are `true`
- Response is in tRPC format (nested under result.data.json)

**❌ If it fails:**
- Add VideoSDK credentials to `backend/.env`
- Restart the backend server

---

## Step 5: Test Token Generation

```powershell
# Generate a VideoSDK token
curl 'http://localhost:8081/api/trpc/videosdk.getToken'
```

**Expected Response:**
```json
{
  "result": {
    "data": {
      "json": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

**✅ Success Criteria:**
- Token is a valid JWT string (starts with "eyJ")
- No errors in response
- Backend console shows: "[VideoSDK tRPC] Token generated successfully"

**❌ If it fails:**
- Check backend console for error details
- Verify VideoSDK credentials are valid
- Ensure JWT library is installed

**Save the token for next step!** Copy the token value (without quotes).

---

## Step 6: Test Meeting Creation

Replace `YOUR_TOKEN_HERE` with the token from Step 5:

```powershell
# Create a meeting (PowerShell syntax)
$token = "YOUR_TOKEN_HERE"
$body = @{
    token = $token
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:8081/api/trpc/videosdk.createMeeting' -Method POST -Body $body -ContentType 'application/json'
```

**Alternative using curl:**
```powershell
curl -X POST 'http://localhost:8081/api/trpc/videosdk.createMeeting' -H 'Content-Type: application/json' -d '{\"token\":\"YOUR_TOKEN_HERE\"}'
```

**Expected Response:**
```json
{
  "result": {
    "data": {
      "json": {
        "meetingId": "abcd-efgh-ijkl-mnop"
      }
    }
  }
}
```

**✅ Success Criteria:**
- Meeting ID is returned (format: xxxx-xxxx-xxxx-xxxx)
- Backend console shows: "[VideoSDK tRPC] Meeting created: ..."

**❌ If it fails:**
- Verify token is valid (not expired)
- Check VideoSDK API is accessible
- Review backend console for API errors

---

## Step 7: Start the React Native App

Open a **third PowerShell terminal**:

```powershell
# Clear cache and start fresh
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
npx expo start -c
```

**Expected Output:**
```
Metro waiting on exp://...
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web
```

**✅ Success Criteria:**
- Metro bundler starts without errors
- No red error screens
- QR code is displayed

---

## Step 8: Check App Console Logs

After the app starts, check the console for these logs:

**Expected Logs:**
```
[BaseUrlBootstrap] Starting initialization...
[baseUrl] Development mode - using local backend or env var
[baseUrl] Final base URL: http://localhost:8081
[tRPC] Base URL: http://localhost:8081
[tRPC] Endpoint: http://localhost:8081/api/trpc
[tRPC] Creating client...
```

**✅ Success Criteria:**
- Base URL is `http://localhost:8081` (not localhost:3000)
- No 404 errors
- No "Client accessed before initialization" warnings

**❌ If you see errors:**
- "404 Not Found" → Backend not running or wrong URL
- "localhost:3000" → Old cache, clear AsyncStorage (Step 9)
- "ECONNREFUSED" → Backend not accessible

---

## Step 9: Clear App Storage (If Needed)

If you see wrong URLs or cached data:

**In the app:**
1. Navigate to `/clear-storage` route
2. Tap "Clear All Storage & Override"
3. Restart the app

**Or manually:**
```powershell
# Stop the app (Ctrl+C in Metro terminal)
# Clear cache
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
# Restart
npx expo start -c
```

---

## Step 10: Test VideoSDK in the App

1. **Navigate to VideoSDK Stream Page:**
   - In the app, go to `/stream-videosdk`

2. **Check Console Logs:**
   ```
   [VideoSDK Context] Fetching token
   [tRPC] → http://localhost:8081/api/trpc/videosdk.getToken GET
   [tRPC] ← 200 http://localhost:8081/api/trpc/videosdk.getToken
   [VideoSDK Context] Token fetched successfully
   ```

3. **Test Meeting Creation:**
   - Tap "Create Meeting" button
   - Check console for:
   ```
   [VideoSDK Context] Creating meeting with token...
   [tRPC] → http://localhost:8081/api/trpc/videosdk.createMeeting POST
   [VideoSDK Context] Meeting created: xxxx-xxxx-xxxx-xxxx
   ```

**✅ Success Criteria:**
- Token is fetched automatically
- Meeting can be created
- No errors in console
- Meeting ID is displayed in UI

---

## Step 11: Test Production Mode (Optional)

To test that production mode uses Render URL:

1. **Build for production:**
   ```powershell
   npx expo build:web
   ```

2. **Check that it uses Render URL:**
   - In production build, base URL should be: `https://rork-no-quest-master-mobile.onrender.com`
   - NOT `http://localhost:8081`

---

## Troubleshooting Guide

### Issue: "Cannot find module 'bun'"
**Solution:** Install bun or use tsx:
```powershell
npm install -g tsx
cd backend
npx tsx server.ts
```

### Issue: "Port 8081 already in use"
**Solution:** Kill the process:
```powershell
# Find process using port 8081
netstat -ano | findstr :8081

# Kill it (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue: "404 Not Found" in app
**Solution:**
1. Verify backend is running (Step 1)
2. Check base URL in console (should be localhost:8081)
3. Clear app storage (Step 9)
4. Restart app

### Issue: "Token generation failed"
**Solution:**
1. Check `backend/.env` has valid VideoSDK credentials
2. Test credentials directly:
   ```powershell
   curl 'http://localhost:8081/api/trpc/videosdk.checkConfig'
   ```
3. Verify backend console for error details

### Issue: "Meeting creation failed"
**Solution:**
1. Verify token is valid (not expired)
2. Check VideoSDK API status
3. Review backend console for API errors
4. Test with a fresh token from Step 5

---

## Success Checklist

After completing all steps, verify:

- [ ] Backend starts on port 8081
- [ ] Health endpoint returns "healthy"
- [ ] All tRPC routes are registered
- [ ] VideoSDK config shows all credentials present
- [ ] Token generation works
- [ ] Meeting creation succeeds
- [ ] App starts without errors
- [ ] App uses correct base URL (localhost:8081 in dev)
- [ ] VideoSDK context fetches token successfully
- [ ] Meeting can be created from app UI
- [ ] No 404 errors in console
- [ ] No "wrong client" warnings

---

## Report Back

After testing, please report:

1. **Which steps passed ✅**
2. **Which steps failed ❌** (with error messages)
3. **Console logs** (if any errors occurred)
4. **Screenshots** (if UI issues)

This will help me fix any remaining issues!

---

## Quick Reference Commands

```powershell
# Start backend
cd backend; bun run server.ts

# Test health
curl http://localhost:8081/api/health

# Test routes
curl http://localhost:8081/api/trpc-routes

# Test config
curl 'http://localhost:8081/api/trpc/videosdk.checkConfig'

# Get token
curl 'http://localhost:8081/api/trpc/videosdk.getToken'

# Start app
npx expo start -c

# Clear cache
Remove-Item -Recurse -Force .expo; npx expo start -c
