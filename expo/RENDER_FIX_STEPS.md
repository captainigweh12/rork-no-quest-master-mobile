# Fix Render Deployment - Step by Step

## What Went Wrong
Render was trying to run `node expo-router/entry` (your mobile app) instead of `bun run backend/server.ts` (your backend server).

## Fix It Now (Choose ONE Option)

---

### **Option A: Use render.yaml (Easiest - Recommended)**

1. **The `render.yaml` file is already created in your project root**

2. **In Render Dashboard:**
   - Go to your service: https://dashboard.render.com
   - Click on your service "rork-no-quest-master-mobile"
   - Go to "Settings" tab
   - Scroll to "Build & Deploy"
   - Make sure "Auto-Deploy" is **ON**
   - Click "Manual Deploy" → "Clear build cache & deploy"

3. **Add Environment Variables:**
   - Still in Settings, go to "Environment" tab
   - Click "Add Environment Variable" for each:
   
   ```
   NODE_ENV = production
   RESEND_API_KEY = re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5
   SUPABASE_WEBHOOK_SECRET = v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6
   AGORA_APP_ID = fba3758e02e6480888adb99887b6aa3c
   AGORA_CUSTOMER_ID = aac6b8c891104ba28e26d41645e59d2d
   AGORA_CUSTOMER_SECRET = 470261239bc044d992a16235426f6938
   AGORA_APP_CERTIFICATE = fd9577a9a43a47dc96ca97a1c0cd2515
   MINT_RTC_TOKEN_SECRET = 071808291210
   VIDEOSDK_API_KEY = 525fd7fd-3c9e-4a1e-a805-5ac36c842a06
   VIDEOSDK_SECRET_KEY = 61dd3c29059eb37528cdd21d8984c1b2db7a132c6e1fce7a50aaaa35dab15b18
   ```

4. **Save and Deploy**
   - Render will automatically redeploy with the correct settings

---

### **Option B: Manual Configuration (If you can't use render.yaml)**

1. **In Render Dashboard, go to your service settings**

2. **Update Build Command:**
   ```bash
   bun install
   ```

3. **Update Start Command:**
   ```bash
   bun run backend/server.ts
   ```

4. **Add the same Environment Variables as Option A**

5. **Save and trigger "Manual Deploy"**

---

## After Deployment Succeeds

### 1. Verify Backend is Running

```bash
# Health check
curl https://rork-no-quest-master-mobile.onrender.com/api/health

# Should return:
# {"status":"healthy","timestamp":"...","backend":"running"}
```

```bash
# Check tRPC routes
curl https://rork-no-quest-master-mobile.onrender.com/api/trpc-routes

# Should return a JSON object with available routes
```

```bash
# Test VideoSDK config
curl https://rork-no-quest-master-mobile.onrender.com/api/trpc/videosdk.checkConfig

# Should return config status
```

### 2. Your Expo App is Already Configured

Your `.env` and `env.development` files already have:
```bash
EXPO_PUBLIC_RORK_API_BASE_URL=https://rork-no-quest-master-mobile.onrender.com
```

### 3. Restart Your Expo App

```bash
# Clear cache and restart
rm -rf .expo .expo-shared
npx expo start -c
```

### 4. Test the Connection

Open your app and try to use a feature that calls the backend (like VideoSDK streaming).

---

## Troubleshooting

### If deployment still fails:

**Check Render Logs:**
- Go to your service dashboard
- Click "Logs" tab
- Look for errors in the deploy logs

**Common Issues:**

1. **"Cannot find module"** → Make sure start command is `bun run backend/server.ts`

2. **"Environment variable missing"** → Double-check all env vars are added in Render dashboard

3. **Port binding error** → Render automatically sets `PORT`. Your server.ts already handles this.

4. **CORS errors** → Your `backend/hono.ts` already has CORS configured for your domain

### If backend deploys but returns 404:

Check that:
- The backend is actually running (check logs)
- You're calling the right URL with `/api/` prefix
- Example: `https://rork-no-quest-master-mobile.onrender.com/api/health`

---

## What Changed

1. ✅ Created `render.yaml` with correct build/start commands
2. ✅ Your `.env` files already point to the Render URL
3. ✅ Your `backend/server.ts` already reads `process.env.PORT`
4. ✅ Your `backend/hono.ts` already has CORS configured

**You just need to:**
- Add the environment variables in Render
- Deploy with the correct start command

---

## Quick Test Script

After deployment, run this in your terminal:

```bash
#!/bin/bash
BASE_URL="https://rork-no-quest-master-mobile.onrender.com"

echo "Testing $BASE_URL..."
echo ""

echo "1. Root endpoint:"
curl -s "$BASE_URL/" | jq .
echo ""

echo "2. Health check:"
curl -s "$BASE_URL/api/health" | jq .
echo ""

echo "3. tRPC routes:"
curl -s "$BASE_URL/api/trpc-routes" | jq .
echo ""

echo "4. VideoSDK config:"
curl -s "$BASE_URL/api/trpc/videosdk.checkConfig" | jq .
echo ""

echo "Done! ✅"
```

Save as `test-backend.sh`, make it executable (`chmod +x test-backend.sh`), and run it.

---

## Support

If you're still stuck, share:
1. The exact error from Render logs
2. A screenshot of your Render service settings
3. The output from the test script above
