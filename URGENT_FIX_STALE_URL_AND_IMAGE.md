# URGENT FIX: Stale URL & Image Error

## Problem

Your app is showing two errors:
1. **Stale URL**: Still connecting to `https://a-j7y7whop54g1lqtqjsr2s.rorktest.dev` (old tunnel)
2. **Image Error**: "source.uri should not be an empty string"

## Root Cause

The stale URL is cached in AsyncStorage and the bootstrap logic hasn't cleared it yet on your device.

## Quick Fix (2 minutes)

### Option 1: Use the Clear Storage Screen (RECOMMENDED)

1. **Open the app** (even with the error)
2. **Navigate to**: Settings → API Debug → Clear Storage
   - Or go directly to `/clear-storage` route
3. **Tap**: "🎯 Force Set Render URL" button
4. **Close the app completely** (swipe away from recent apps)
5. **Restart the app**

### Option 2: Clear App Data (Nuclear Option)

**iOS:**
1. Long press the app icon
2. Remove App
3. Reinstall from Expo Go or rebuild

**Android:**
1. Settings → Apps → Rork
2. Storage → Clear Data
3. Restart app

### Option 3: Manual Code Fix (If buttons don't work)

Add this to the very top of `app/_layout.tsx`, right after imports:

```typescript
// EMERGENCY: Force clear stale URL
import AsyncStorage from '@react-native-async-storage/async-storage';

// Run immediately on module load
(async () => {
  try {
    await AsyncStorage.removeItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
    await AsyncStorage.setItem(
      'EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE',
      'https://rork-no-quest-master-mobile.onrender.com'
    );
    console.log('✅ Emergency URL fix applied');
  } catch (e) {
    console.error('❌ Emergency URL fix failed:', e);
  }
})();
```

Then restart the app.

## Fix for Image Error

The SafeImage component needs a small fix to handle empty strings better:

```typescript
// In components/SafeImage.tsx, update the check:
const clean = uri?.trim();

// Change this line:
if (!clean || loadError) {

// To this:
if (!clean || clean === '' || loadError) {
```

But actually, the current code should already handle this. The error might be from a direct Image usage somewhere. Let me fix it properly.

## Permanent Fix

I'll update the SafeImage component to be more defensive:
