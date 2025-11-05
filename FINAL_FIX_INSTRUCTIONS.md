# FINAL FIX INSTRUCTIONS - Stale URL & Image Error

## Current Issues

1. **Stale URL**: App connecting to `https://a-j7y7whop54g1lqtqjsr2s.rorktest.dev`
2. **Image Error**: "source.uri should not be an empty string"

## ✅ Fixes Applied

### 1. SafeImage Component Fixed
- **File**: `components/SafeImage.tsx`
- **Fix**: Added defensive checks for empty/invalid URIs
- **Status**: ✅ Complete

### 2. URL Bootstrap Enhanced
- **File**: `app/_layout.tsx`
- **Fix**: Aggressive stale URL detection and clearing
- **Status**: ✅ Complete

## 🚀 How to Apply the Fix (Choose ONE method)

### Method 1: Use Clear Storage Screen (EASIEST - 30 seconds)

1. **Open the app** (even with errors showing)
2. **Navigate to**: `/clear-storage` route
   - Or: Settings → API Debug → Clear Storage
3. **Tap**: "🎯 Force Set Render URL" (green button at top)
4. **Wait** for success message
5. **Close app completely** (swipe away from recent apps)
6. **Restart the app**

✅ **Expected Result**: App connects to `https://rork-no-quest-master-mobile.onrender.com`

### Method 2: Clear App Data (NUCLEAR - 2 minutes)

**iOS:**
```
1. Long press app icon
2. Remove App
3. Reinstall from Expo Go
```

**Android:**
```
1. Settings → Apps → Rork
2. Storage → Clear Data
3. Restart app
```

### Method 3: Manual AsyncStorage Clear (DEVELOPER - 1 minute)

Add this code temporarily to `app/_layout.tsx` at the very top, right after the imports:

```typescript
// Add after all imports, before any other code
import AsyncStorage from '@react-native-async-storage/async-storage';

// EMERGENCY: Run immediately
(async () => {
  try {
    const RENDER_URL = 'https://rork-no-quest-master-mobile.onrender.com';
    await AsyncStorage.removeItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
    await AsyncStorage.setItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE', RENDER_URL);
    (globalThis as any).__RORK_BASE_URL_OVERRIDE = RENDER_URL;
    console.log('[EMERGENCY] ✅ Forced Render URL');
  } catch (e) {
    console.error('[EMERGENCY] Failed:', e);
  }
})();
```

Then:
1. Save the file
2. Restart the app
3. Remove the code after it works

## 🔍 Verification

After applying the fix, you should see:

1. **Loading screen shows**: `https://rork-no-quest-master-mobile.onrender.com`
2. **No image errors**
3. **App loads successfully**

## 📊 What Was Fixed

### SafeImage Component
**Before:**
```typescript
if (!clean || loadError) {
  return (fallback ?? null) as any;
}
```

**After:**
```typescript
// More defensive checks
if (!clean || clean === '' || clean.length === 0 || loadError) {
  return (fallback ?? null) as any;
}

// URL validation
const isValidUrl = clean.startsWith('http://') || clean.startsWith('https://') || 
                   clean.startsWith('data:') || clean.startsWith('file://');
if (!isValidUrl) {
  console.warn('[SafeImage] Invalid URI format:', clean);
  return (fallback ?? null) as any;
}
```

### URL Bootstrap
**Enhanced logic in `app/_layout.tsx`:**
- Detects ANY non-Render, non-localhost URL
- Forces Render URL in production
- Clears stale URLs automatically

## ❓ Troubleshooting

### Issue: Still seeing rorktest.dev URL

**Solution**: The cached URL is persistent. Use Method 1 or 2 above.

### Issue: Image error persists

**Solution**: 
1. Check if you're using `<Image>` directly anywhere (should use `<SafeImage>`)
2. Restart the app after the SafeImage fix

### Issue: Can't access /clear-storage screen

**Solution**: Use Method 2 (Clear App Data) or Method 3 (Manual code)

## 📝 Summary

**Files Modified:**
1. ✅ `components/SafeImage.tsx` - Fixed empty URI handling
2. ✅ `app/_layout.tsx` - Enhanced URL bootstrap (already done)
3. ✅ `app/clear-storage.tsx` - Added Force Set button (already done)

**Action Required:**
- Use Method 1, 2, or 3 above to clear the stale URL from your device

**Expected Time:** 30 seconds - 2 minutes

## 🎯 Next Steps After Fix

Once the app loads successfully:

1. **Verify** the correct URL is being used
2. **Test** the app functionality
3. **Deploy** the SafeImage fix to production (already in code)
4. **Monitor** for any other issues

## 💡 Prevention

The enhanced bootstrap logic will prevent this from happening again by:
- Automatically detecting stale URLs
- Forcing production URL in production builds
- Providing manual fix button in settings

---

**Need Help?** Check the logs in the app for `[EMERGENCY]`, `[baseUrl]`, or `[SafeImage]` messages.
