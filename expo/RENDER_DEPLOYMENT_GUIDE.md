# Render Deployment Guide for Backend

## The Problem
Render was trying to run `node expo-router/entry` which is the Expo mobile app entry point, not your backend server.

## Solution

### Option 1: Use the render.yaml file (Recommended)
1. The `render.yaml` file in the root directory will automatically configure your deployment
2. In your Render dashboard, make sure "Auto-Deploy" is enabled
3. Render will read `render.yaml` and use the correct settings

### Option 2: Manual Configuration in Render Dashboard
If you prefer to configure manually:

1. Go to your Render service settings
2. Update these settings:

**Build Command:**
```bash
bun install
```

**Start Command:**
```bash
bun run backend/server.ts
```

**Environment Variables:**
Add these in the Render dashboard (Environment tab):
- `NODE_ENV` = `production`
- `PORT` = `10000` (Render provides this automatically)
- `RESEND_API_KEY` = (your Resend API key)
- `SUPABASE_WEBHOOK_SECRET` = (your Supabase webhook secret)
- `VIDEOSDK_API_KEY` = (your VideoSDK API key)
- `VIDEOSDK_SECRET_KEY` = (your VideoSDK secret key)
- `AGORA_APP_ID` = (your Agora app ID if using Agora)
- `AGORA_APP_CERTIFICATE` = (your Agora certificate if using Agora)

## After Deployment

Your backend will be available at:
```
https://rork-no-quest-master-mobile.onrender.com
```

Test it with:
```bash
curl https://rork-no-quest-master-mobile.onrender.com/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "backend": "running"
}
```

## Update Your Expo App

Update `.env.development` or `.env.production`:
```bash
EXPO_PUBLIC_RORK_API_BASE_URL=https://rork-no-quest-master-mobile.onrender.com
```

Then restart your Expo app:
```bash
rm -rf .expo
npx expo start -c
```

## Common Issues

### 1. Module Not Found
- Make sure the start command is: `bun run backend/server.ts`
- NOT: `node expo-router/entry`

### 2. Environment Variables Not Loading
- Add all required env vars in Render dashboard
- OR create a `backend/.env` file (not recommended for production)

### 3. Port Issues
- Render automatically sets the `PORT` environment variable
- Your server.ts already reads `process.env.PORT` with fallback to 8081

## Verify Deployment

1. Health check:
```bash
curl https://rork-no-quest-master-mobile.onrender.com/api/health
```

2. Check tRPC routes:
```bash
curl https://rork-no-quest-master-mobile.onrender.com/api/trpc-routes
```

3. Test VideoSDK config:
```bash
curl https://rork-no-quest-master-mobile.onrender.com/api/trpc/videosdk.checkConfig
```
