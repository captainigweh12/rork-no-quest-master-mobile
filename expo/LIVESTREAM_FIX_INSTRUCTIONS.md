# Live Streaming 404 Fix Instructions

## Problem Summary
Your app is getting 404 errors when trying to access the VideoSDK tRPC endpoints because your Render backend deployment is failing. Render is trying to run `expo-router/entry` instead of your backend server.

## Current Status

### ✅ What's Working
- VideoSDK routes ARE properly configured in `backend/trpc/app-router.ts`
- Backend code is correct with all routes at `/api/trpc/videosdk.*`
- Environment variables are set in both `.env` and `env.development`
- tRPC client is configured correctly

### ❌ What's Broken
- Render deployment is failing with: `Error: Cannot find module '/opt/render/project/src/expo-router/entry'`
- This happens because Render is trying to start the Expo app instead of the backend
- Your backend is not running on `https://rork-no-quest-master-mobile.onrender.com`

## Solution Steps

### Step 1: Fix Render Configuration

I've updated your `render.yaml` file to:
1. Use `bun backend/server.ts` instead of `bun run backend/server.ts`
2. Added all required environment variables as synced secrets

### Step 2: Add Environment Variables to Render

Go to your Render dashboard (https://dashboard.render.com) and add these environment variables to your service:

```
VIDEOSDK_API_KEY=525fd7fd-3c9e-4a1e-a805-5ac36c842a06
VIDEOSDK_SECRET_KEY=61dd3c29059eb37528cdd21d8984c1b2db7a132c6e1fce7a50aaaa35dab15b18
RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5
SUPABASE_WEBHOOK_SECRET=v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6
AGORA_APP_ID=fba3758e02e6480888adb99887b6aa3c
AGORA_APP_CERTIFICATE=fd9577a9a43a47dc96ca97a1c0cd2515
AGORA_CUSTOMER_ID=aac6b8c891104ba28e26d41645e59d2d
AGORA_CUSTOMER_SECRET=470261239bc044d992a16235426f6938
MINT_RTC_TOKEN_SECRET=071808291210
```

### Step 3: Verify Render Build Settings

In your Render service settings, ensure:
- **Build Command**: `bun install`
- **Start Command**: `bun backend/server.ts`
- **Environment**: Node

### Step 4: Redeploy

After updating environment variables:
1. Commit the updated `render.yaml` to git
2. Push to your repository
3. Render will automatically redeploy

Or manually trigger a deploy from the Render dashboard.

### Step 5: Test the Deployment

Once deployed, test these URLs (replace with your actual Render URL):

```bash
# Test root
curl https://rork-no-quest-master-mobile.onrender.com/

# Test API root
curl https://rork-no-quest-master-mobile.onrender.com/api

# Test health
curl https://rork-no-quest-master-mobile.onrender.com/api/health

# Test tRPC routes diagnostic
curl https://rork-no-quest-master-mobile.onrender.com/api/trpc-routes

# Test VideoSDK config
curl "https://rork-no-quest-master-mobile.onrender.com/api/trpc/videosdk.checkConfig"

# Test VideoSDK token
curl "https://rork-no-quest-master-mobile.onrender.com/api/trpc/videosdk.getToken"
```

All should return JSON (not 404).

### Step 6: Test from Mobile App

I've created a test page at `/test-live-api` in your app. 

1. Start your app: `bun start`
2. Navigate to the test page
3. Press "Run All Tests"
4. Check if all endpoints return 200 OK

## Alternative: Use Local Backend with Tunnel

If Render continues to have issues, you can use your local backend with a tunnel:

### Option A: LHR.life Tunnel (Previous Working Solution)

```bash
# In one terminal, start your backend
cd /path/to/project
bun backend/server.ts

# In another terminal, create tunnel
# (Use whatever tunnel service you used before)
```

Then update `.env`:
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://YOUR_TUNNEL_URL.lhr.life
```

### Option B: Ngrok
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8081
```

Then update `.env` with the ngrok URL.

## Debugging Render Logs

To see what's happening on Render:
1. Go to https://dashboard.render.com
2. Click on your service
3. Click "Logs" tab
4. Look for:
   - ✅ "🚀 [Hono] Listening on: http://localhost:10000"
   - ✅ "[ENV CHECK] VIDEOSDK_API_KEY present: true"
   - ❌ Any error messages

## Common Issues

### Issue: "Cannot find module"
**Solution**: Make sure start command is `bun backend/server.ts` (not `bun run ...`)

### Issue: "Missing required environment variable"
**Solution**: Add all env vars listed in Step 2 to Render dashboard

### Issue: Port already in use
**Solution**: Render sets PORT=10000, which is already configured in render.yaml

### Issue: Still getting 404
**Solution**: 
1. Check Render logs to ensure server started
2. Test with curl commands from Step 5
3. Clear app cache: `rm -rf .expo && npx expo start -c`
4. Check if there's a stored override: Go to `/clear-storage` in your app

## After It Works

Once your backend is deployed and responding:
1. All VideoSDK features should work
2. Live streaming will work
3. The 404 errors will be gone

## Need More Help?

Run the test page I created (`/test-live-api`) and share:
1. The test results (all should be green/200)
2. Render deployment logs
3. Any error messages from the app console
