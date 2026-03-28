# Render Deployment Checklist

## ✅ Quick Fix Checklist

### Step 1: Update Render Settings
- [ ] Go to https://dashboard.render.com
- [ ] Find service: "rork-no-quest-master-mobile"
- [ ] Click "Settings"

### Step 2: Fix Build & Start Commands
- [ ] **Build Command:** `bun install`
- [ ] **Start Command:** `bun run backend/server.ts`
- [ ] ⚠️ **NOT:** `node expo-router/entry`

### Step 3: Add Environment Variables (in Render Dashboard)
Copy these exactly into Render's Environment tab:

```
NODE_ENV=production
RESEND_API_KEY=re_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5
SUPABASE_WEBHOOK_SECRET=v1,whsec_jcSmWGH5T217lHoXXSDfTgIQMv7mBYJ3xN2RCrQeXMZ3t23w8nGxUXK+IheRdBwHEjVPWNfmmU4k8PA6
AGORA_APP_ID=fba3758e02e6480888adb99887b6aa3c
AGORA_CUSTOMER_ID=aac6b8c891104ba28e26d41645e59d2d
AGORA_CUSTOMER_SECRET=470261239bc044d992a16235426f6938
AGORA_APP_CERTIFICATE=fd9577a9a43a47dc96ca97a1c0cd2515
MINT_RTC_TOKEN_SECRET=071808291210
VIDEOSDK_API_KEY=525fd7fd-3c9e-4a1e-a805-5ac36c842a06
VIDEOSDK_SECRET_KEY=61dd3c29059eb37528cdd21d8984c1b2db7a132c6e1fce7a50aaaa35dab15b18
```

### Step 4: Deploy
- [ ] Click "Manual Deploy" → "Clear build cache & deploy"
- [ ] Wait for build to complete (watch logs)

### Step 5: Verify Deployment
Run these commands in your terminal:

```bash
# Test 1: Health check
curl https://rork-no-quest-master-mobile.onrender.com/api/health
```
- [ ] Returns: `{"status":"healthy",...}`

```bash
# Test 2: Check routes
curl https://rork-no-quest-master-mobile.onrender.com/api/trpc-routes
```
- [ ] Returns: JSON with routes list

### Step 6: Test from Expo App
- [ ] Clear Expo cache: `rm -rf .expo`
- [ ] Restart: `npx expo start -c`
- [ ] Open app and test VideoSDK/streaming features
- [ ] Check console for any 404 errors

---

## 🔴 Current Error vs ✅ Expected Result

### ❌ What's Happening Now:
```
Error: Cannot find module '/opt/render/project/src/expo-router/entry'
```
**Reason:** Render is trying to run your Expo mobile app instead of the backend

### ✅ What Should Happen:
```
🚀 [Hono] Listening on: http://localhost:10000
🌐 LAN address: http://10.x.x.x:10000

[ENV CHECK]
VIDEOSDK_API_KEY present: true
VIDEOSDK_SECRET_KEY present: true
...
```

---

## 🎯 The Fix in One Sentence
**Change Render's start command from `node expo-router/entry` to `bun run backend/server.ts`**

---

## 📝 Files Created for You
- `render.yaml` - Auto-config file for Render
- `RENDER_DEPLOYMENT_GUIDE.md` - Detailed guide
- `RENDER_FIX_STEPS.md` - Step-by-step instructions
- `RENDER_CHECKLIST.md` - This checklist

---

## 🆘 Still Not Working?

### Check These:
1. **Render Logs** - Any error messages?
2. **Environment Variables** - All added correctly?
3. **Start Command** - Is it `bun run backend/server.ts`?
4. **Build Command** - Is it `bun install`?

### Get Help:
- Share the exact error from Render logs
- Share a screenshot of your Render service settings
- Run the test curl commands and share the output
