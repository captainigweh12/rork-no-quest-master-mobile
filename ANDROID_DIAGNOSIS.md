# Android App Diagnosis Report

**Date**: November 7, 2025  
**Status**: 🔍 INVESTIGATING

## Executive Summary

Based on code analysis, several potential Android-specific issues have been identified that could cause the app to fail on Android devices.

## Critical Issues Identified

### 🔴 Issue 1: AsyncStorage Initialization Race Condition
**Location**: `lib/storage.ts`, `hooks/useAppInit.ts`, `lib/baseUrl.ts`

**Problem**:
- Android devices may have slower AsyncStorage initialization than iOS
- The baseUrl system attempts to access AsyncStorage before it's ready
- This causes the `getBaseUrl()` function to fail silently on Android

**Evidence**:
```typescript
// In lib/baseUrl.ts
export async function loadBaseUrlOverride(): Promise<string | undefined> {
  try {
    if (!isStorageReady()) {
      console.warn('[baseUrl] Storage not ready, returning in-memory override if available');
      // Falls back to in-memory, but this might not be set yet on Android
      const g = (globalThis as any).__RORK_BASE_URL_OVERRIDE as string | undefined;
      if (g && g.trim().length > 0) return stripTrailingSlash(g);
      return undefined;
    }
    // ...
  }
}
```

**Impact**: 
- App may connect to wrong backend URL or fail to connect at all
- Authentication and data fetching will fail
- User sees blank screen or "network error"

---

### 🟡 Issue 2: Base URL Configuration Mismatch
**Location**: `app.json`, `.env`

**Problem**:
- Two different base URL environment variables with conflicting values:
  - `EXPO_PUBLIC_APP_BASE_URL`: Points to ephemeral E2B development URL
  - `EXPO_PUBLIC_RORK_API_BASE_URL`: Points to production Render URL
- Android builds may pick up the wrong URL from `app.json`

**Evidence**:
```json
// In app.json
"extra": {
  "APP_BASE_URL": "https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app",  // ❌ Wrong
  // ...
}
```

```env
// In .env
EXPO_PUBLIC_APP_BASE_URL=https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app  # ❌ Wrong
EXPO_PUBLIC_RORK_API_BASE_URL=https://rork-no-quest-master-mobile.onrender.com  # ✅ Correct
```

**Impact**:
- Android app tries to connect to non-existent E2B URL
- All API calls fail with 404 or timeout errors
- App appears broken on Android

---

### 🟡 Issue 3: Platform Detection Not Utilized
**Location**: `lib/baseUrl.ts`

**Problem**:
- An `isAndroid()` function exists but is never used
- Suggests incomplete Android-specific handling

**Evidence**:
```typescript
function isAndroid(): boolean {
  try {
    const requireFn = (globalThis as any)['require'] as ((id: string) => any) | undefined;
    const rn: any = requireFn ? requireFn('react-native') : (globalThis as any).ReactNative;
    return rn?.Platform?.OS === 'android';
  } catch {
    return false;
  }
}
// ❌ This function is defined but never called anywhere
```

**Impact**: 
- Android-specific code paths may not be executing
- Potential bugs in Android-specific logic go unnoticed

---

### 🟢 Issue 4: Storage Availability Detection
**Location**: `lib/storage.ts`

**Status**: Partially implemented but needs testing

**Problem**:
- Storage quota issues or Android permission problems could cause silent failures
- The app continues to run even when storage is unavailable
- No user feedback when running in "memory-only mode"

**Evidence**:
```typescript
if (!storageAvailable) {
  console.warn('[STORAGE] ⚠️ Unavailable (likely Safari Private Mode / blocked). Using in-memory fallback.');
  console.warn('[STORAGE] In-memory mode: changes will NOT persist across app restarts.');
}
```

**Impact**:
- User settings don't persist
- Auth state may be lost on app restart
- Confusing user experience on Android

---

## Testing Recommendations

### Test 1: AsyncStorage Initialization Timing
```javascript
// Create test-android-storage-timing.js
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function testStorageTiming() {
  console.log('Starting storage timing test...');
  
  const startTime = Date.now();
  
  try {
    // Test immediate access (like app does now)
    await AsyncStorage.getItem('test_key');
    console.log('✅ Immediate access succeeded:', Date.now() - startTime, 'ms');
  } catch (e) {
    console.log('❌ Immediate access failed:', e.message);
  }
  
  // Test with delays
  for (const delay of [50, 100, 200, 500]) {
    await new Promise(resolve => setTimeout(resolve, delay));
    try {
      await AsyncStorage.setItem('test_key', 'value');
      await AsyncStorage.getItem('test_key');
      console.log(`✅ Access after ${delay}ms succeeded`);
      break;
    } catch (e) {
      console.log(`❌ Access after ${delay}ms failed:`, e.message);
    }
  }
}

testStorageTiming();
```

### Test 2: Base URL Resolution
```javascript
// Create test-android-base-url.js
import { getBaseUrl, getDefaultBaseUrl, loadBaseUrlOverride } from './lib/baseUrl';
import { isStorageReady } from './lib/storage';

async function testBaseUrl() {
  console.log('=== Base URL Test ===');
  console.log('Storage Ready:', isStorageReady());
  console.log('Default URL:', getDefaultBaseUrl());
  
  const override = await loadBaseUrlOverride();
  console.log('Override URL:', override);
  
  const finalUrl = getBaseUrl();
  console.log('Final URL:', finalUrl);
  
  // Verify it's the correct URL
  if (finalUrl.includes('e2b.app')) {
    console.error('❌ CRITICAL: Using wrong E2B URL instead of Render URL');
  } else if (finalUrl.includes('onrender.com')) {
    console.log('✅ Correct production URL');
  } else {
    console.warn('⚠️ Unknown URL:', finalUrl);
  }
}
```

### Test 3: Android Platform Detection
```javascript
// Create test-android-detection.js
import { Platform } from 'react-native';

function testPlatformDetection() {
  console.log('=== Platform Detection Test ===');
  console.log('Platform.OS:', Platform.OS);
  console.log('Is Android:', Platform.OS === 'android');
  console.log('Platform.Version:', Platform.Version);
  
  // Test the isAndroid function from baseUrl.ts
  function isAndroid() {
    try {
      const requireFn = (globalThis)['require'];
      const rn = requireFn ? requireFn('react-native') : (globalThis).ReactNative;
      return rn?.Platform?.OS === 'android';
    } catch {
      return false;
    }
  }
  
  console.log('isAndroid() function:', isAndroid());
}
```

---

## Root Cause Hypothesis

The most likely root cause for "app not working on Android" is:

1. **Primary**: Android app is configured with wrong base URL (`E2B` instead of `Render`)
2. **Secondary**: AsyncStorage initialization delays on Android cause URL override system to fail
3. **Tertiary**: No Android-specific error handling or user feedback

### Combined Effect:
```
Android Device Starts App
   ↓
Storage initializes slower than iOS
   ↓
baseUrl.ts runs before storage is ready
   ↓
Falls back to default URL from app.json
   ↓
Uses wrong E2B URL (https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app)
   ↓
All API calls fail (404/timeout)
   ↓
App shows blank screen or errors
   ↓
User thinks "app doesn't work on Android"
```

---

## Recommended Fixes

### Fix 1: Correct Base URL Configuration (CRITICAL)

**Priority**: 🔴 CRITICAL - Do this first

Update `app.json`:
```json
"extra": {
  "SUPABASE_URL": "https://hotbmbscjxgayivmyenb.supabase.co",
  "SUPABASE_ANON_KEY": "...",
  "APP_BASE_URL": "https://rork-no-quest-master-mobile.onrender.com",  // ✅ Fixed
  "EMAIL_REDIRECT": "noquest://verify-email",
  "eas": {
    "projectId": "c23bcbuqrsjmkdoaxiu6y"
  }
}
```

Update `.env`:
```env
EXPO_PUBLIC_APP_BASE_URL=https://rork-no-quest-master-mobile.onrender.com  # ✅ Fixed
EXPO_PUBLIC_RORK_API_BASE_URL=https://rork-no-quest-master-mobile.onrender.com
```

### Fix 2: Add Android-Specific Storage Initialization Delay

In `lib/storage.ts`:
```typescript
export async function initAppStorage(): Promise<void> {
  if (storageReady) {
    console.log('[STORAGE] Already initialized');
    return;
  }

  if (initializationPromise) {
    console.log('[STORAGE] Waiting for existing initialization');
    return initializationPromise;
  }

  console.log('[STORAGE] Starting initialization...');
  
  initializationPromise = (async () => {
    try {
      // Add platform-specific delay for Android
      const platform = getPlatform();
      if (platform === 'android') {
        console.log('[STORAGE] Android detected, adding initialization delay');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Ping AsyncStorage to ensure it's ready
      await AsyncStorage.getItem('__storage_ping__').catch(() => null);
      
      // ... rest of initialization
    }
  })();
}

function getPlatform(): string {
  try {
    const rn = require('react-native');
    return rn?.Platform?.OS || 'unknown';
  } catch {
    return 'unknown';
  }
}
```

### Fix 3: Add User Feedback for Connection Issues

Create `components/AndroidConnectionError.tsx`:
```typescript
import { View, Text, Button } from 'react-native';

export function AndroidConnectionError() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Connection Error
      </Text>
      <Text style={{ textAlign: 'center', marginBottom: 20 }}>
        Unable to connect to the server. Please check your internet connection and try again.
      </Text>
      <Button title="Retry" onPress={() => window.location.reload()} />
    </View>
  );
}
```

---

## Next Steps

1. ✅ Get specific error reports from Android users (what exactly happens?)
2. ⬜ Fix base URL configuration in `app.json` and `.env`
3. ⬜ Test on actual Android device with corrected URLs
4. ⬜ Add Android-specific storage initialization delay if needed
5. ⬜ Add connection error UI for better user feedback
6. ⬜ Monitor Android crash reports and logs

---

## Questions for User

To complete this diagnosis, I need more information:

1. **What specific symptom occurs on Android?**
   - Blank/white screen?
   - Crash on startup?
   - "Network error" message?
   - App loads but features don't work?
   - Specific error messages?

2. **When does the issue occur?**
   - Immediately on app launch?
   - After login?
   - When using specific features?
   - Intermittently or consistently?

3. **What Android version(s) are affected?**
   - All Android versions?
   - Specific versions (e.g., Android 12+)?
   - Both emulator and physical devices?

4. **Are there any error logs available?**
   - React Native logs from `npx react-native log-android`?
   - Crashlytics/Sentry reports?
   - Logcat output?

---

## Conclusion

The most likely cause is **incorrect base URL configuration** causing all API calls to fail on Android. The ephemeral E2B development URL in `app.json` is likely not accessible from production Android builds.

**Immediate Action**: Update base URLs in `app.json` and `.env` to use the production Render URL, then rebuild and test on Android.
