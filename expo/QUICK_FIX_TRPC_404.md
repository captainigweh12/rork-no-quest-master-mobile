# 🚨 Quick Fix for tRPC 404 Errors

## Symptoms

You're seeing these errors:
- ❌ `[tRPC] Server returned HTML instead of JSON`
- ❌ `[tRPC] Status: 404`
- ❌ `[VideoSDK Context] Token fetch error: TRPCClientError: JSON Parse error`
- ❌ Banner shows: `tRPC Base: https://a-...rorktest.dev/api/trpc`

## The Problem

Your app is trying to reach an old, dead URL instead of the production server.

## The Fix (2 Minutes)

### Option 1: Automatic Fix (Recommended)

**Just restart your app!** The new code will automatically detect and fix the stale URL.

1. **Close the app completely** (swipe away from recent apps)
2. **Restart the app**
3. **Done!** The app will automatically use the correct URL

### Option 2: Manual Fix (If automatic doesn't work)

1. **Open the app** (even if showing errors)

2. **Go to Settings → API Debug**
   - Or navigate to `/clear-storage`

3. **Tap the green button: "🎯 Force Set Render URL"**

4. **Wait for confirmation:**
   ```
   ✅ Render URL has been set to:
   https://rork-no-quest-master-mobile.onrender.com
   
   Please close and restart the app.
   ```

5. **Close the app completely:**
   - Swipe it away from recent apps
   - Don't just minimize it

6. **Restart the app**

7. **Verify it worked:**
   - Go back to Settings → API Debug
   - Tap "Test Connection"
   - Should see: ✅ Success!

## How to Verify It's Fixed

### Check 1: Banner (Dev Mode Only)
The banner at the top should show:
```
tRPC Base: https://rork-no-quest-master-mobile.onrender.com/api/trpc
```

### Check 2: No More Errors
- No more HTML/JSON errors in the console
- VideoSDK token fetch works
- Live streaming features work

### Check 3: Test Connection
- Go to Settings → API Debug
- Tap "Test Connection"
- Should see: ✅ Success!

## Still Having Issues?

### Check Your Internet Connection
Make sure you're connected to the internet and can reach:
- https://rork-no-quest-master-mobile.onrender.com

### Check the Backend
Open this URL in your browser:
- https://rork-no-quest-master-mobile.onrender.com/api/health

Should return JSON like:
```json
{"status":"ok"}
```

If you see HTML or an error page, the backend might be down.

### Clear All Storage (Nuclear Option)
1. Go to Settings → API Debug
2. Tap "🧹 Remove Override Key"
3. Close and restart the app
4. If still not working, tap "🎯 Force Set Render URL"
5. Close and restart again

## What Changed?

The app now:
- ✅ Automatically detects stale URLs on startup
- ✅ Always uses the production URL in production builds
- ✅ Provides a manual fix button if needed
- ✅ Prevents this issue from happening again

## Technical Details

**Old URL (Dead):**
```
https://a-...rorktest.dev/api/trpc
```

**New URL (Correct):**
```
https://rork-no-quest-master-mobile.onrender.com/api/trpc
```

The old URL was an ephemeral tunnel that's no longer active. The new URL points to the stable production server on Render.

## Need Help?

If you're still seeing errors after trying both options:
1. Check the console logs for any error messages
2. Take a screenshot of the error
3. Note which screen you're on when the error occurs
4. Contact support with this information
