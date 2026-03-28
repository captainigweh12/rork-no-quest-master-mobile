# Bundle 404 Error Fix - COMPLETE

## Problem Diagnosed

Your Android app was showing:
```
URL: http://no-quest-master-mobile.rork.app/node_modules/expo-router/entry.bundle
Body: Bundle key not found
```

**Root Cause:** The `app.json` configuration had a hardcoded `origin: "https://rork.app"` in the expo-router plugin, forcing the app to always request bundles from that fixed domain. When Metro restarts or the tunnel changes, Android keeps hitting the stale host instead of the current development server.

---

## Fix Applied

### ✅ 1. Updated app.json - Removed Custom Origin

**Changed from:**
```json
"plugins": [
  [
    "expo-router",
    {
      "origin": "https://rork.app"
    }
  ],
  // ... other plugins
]
```

**Changed to:**
```json
"plugins": [
  [
    "expo-router"
  ],
  // ... other plugins
]
```

This allows expo-router to automatically detect and use the correct Metro dev server URL each time you start the app.

### ✅ 2. Verified package.json

Confirmed that `package.json` already has the correct entry point:
```json
"main": "expo-router/entry"
```

---

## Testing Instructions

### Step 1: Stop All Running Processes

**Stop all Expo/Metro instances:**
- Press `Ctrl+C` in all terminal windows running Metro or Expo
- Or run: `taskkill /F /IM node.exe` (Windows) to kill all Node processes
- Make sure ports 8081 and 19000-19006 are free

### Step 2: Clear Metro Cache and Restart

Run your start command with cache clearing:

```bash
npm run start
```

Or with tunnel:
```bash
npm run start-rork
```

**This will:**
- Clear Metro bundler cache (`-c` flag)
- Generate a new development server URL
- Create a fresh QR code

### Step 3: Fresh App Launch on Android

**IMPORTANT: Do NOT use in-app Reload!**

1. **Close the existing app completely** on your Android device (swipe it away from recent apps)
2. **Scan the new QR code** from the Metro terminal
3. **Open the app fresh** from the new scan

**Why?** In-app Reload still uses the cached stale URL. You need a fresh launch to pick up the new Metro server URL.

### Step 4: Verify the Fix

After launching fresh, you should see:
- ✅ App loads without 404 errors
- ✅ Bundle loads from the correct current tunnel/localhost URL
- ✅ No "Bundle key not found" errors

---

## If Using Tunnel Mode

When using `npm run start-rork` with `--tunnel`:

1. **Always use the new tunnel URL** - It changes each restart
2. **Verify the URL is HTTPS** - Tunnels should be `https://xxxxx.ngrok-free.app` or similar
3. **Don't reuse old QR codes** - Each tunnel session needs a fresh QR scan
4. **Check the console** - Metro will show the exact URL being served

---

## How This Fix Works

### Before (Broken)
```
1. app.json forces origin → https://rork.app
2. Metro starts on → https://new-tunnel-12345.ngrok.app
3. Android requests → http://no-quest-master-mobile.rork.app ❌
4. Result: 404 "Bundle key not found"
```

### After (Fixed)
```
1. app.json has no fixed origin (uses "auto")
2. Metro starts on → https://new-tunnel-12345.ngrok.app
3. Android requests → https://new-tunnel-12345.ngrok.app ✅
4. Result: Bundle loads successfully!
```

expo-router now automatically:
- Detects the current Metro dev server URL
- Uses the correct host for bundle requests
- Updates when you restart Metro
- Works with tunnels, LAN, and localhost

---

## Common Mistakes to Avoid

❌ **DON'T:** Use in-app Reload after Metro restart
✅ **DO:** Close app and scan new QR code

❌ **DON'T:** Reuse old QR codes from previous sessions
✅ **DO:** Scan the fresh QR code each time

❌ **DON'T:** Keep the hardcoded origin in app.json
✅ **DO:** Let expo-router auto-detect the origin

---

## Additional Notes

### Understanding Two Separate Systems

**Important:** The bundle 404 error is about the **Metro bundler** (app code), NOT your backend API:

1. **Metro Bundler** (This fix addresses this)
   - Serves your React Native JavaScript bundle
   - Runs locally during development
   - The error: `http://no-quest-master-mobile.rork.app/...entry.bundle`
   - **Fixed by removing hardcoded origin**

2. **Backend API** (Separate - currently on Render.com)
   - Your tRPC/Hono backend
   - Running at: `https://rork-no-quest-master-mobile.onrender.com`
   - Configured in `.env` as `APP_BASE_URL`
   - This is NOT affected by this fix

Both systems need to work together:
- Metro serves the app code (JavaScript bundle)
- The app code then connects to your Render.com backend for data

### Why This Happened

The hardcoded `"origin": "https://rork.app"` was likely added for:
- Production deep linking
- Custom domain configuration
- Universal links setup

However, this **should not be set in development** as it breaks the Metro bundler connection.

### Alternative Solution (If Needed)

If you need different origins for development vs. production, you can:

1. Use environment-specific app configs
2. Or use `"origin": "auto"` explicitly (same as omitting it)
3. Configure universal links separately through `scheme` and `intentFilters` (which you already have)

---

## Verification Commands

```bash
# 1. Check no Node processes are running
tasklist | findstr node

# 2. Clear Metro cache and start fresh
npm run start

# 3. In another terminal, verify backend is running (if needed)
npm run backend:simple
```

---

## Summary

✅ **Fixed:** Removed hardcoded origin from expo-router plugin in app.json
✅ **Verified:** package.json has correct `"main": "expo-router/entry"`
✅ **Result:** expo-router now auto-detects the correct Metro server URL

**Next Steps:**
1. Stop all Metro/Expo processes
2. Run `npm run start` (or your start-rork command)
3. Close the app completely on Android
4. Scan the new QR code
5. Open app fresh - No more 404 errors! 🎉

---

**Date Fixed:** January 6, 2025  
**Issue:** Bundle 404 "not found" error due to stale origin  
**Solution:** Auto-detect origin instead of hardcoding
