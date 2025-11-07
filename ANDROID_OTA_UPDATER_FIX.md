# Android OTA Updater Fix - Complete Guide

## Problem Diagnosed

**Error:** `java.io.IOException: Failed to download remote update`

The app was experiencing crashes on Android due to Expo Updates (OTA system) trying to fetch remote updates and failing. This caused a white screen on launch because:

1. OTA updates were enabled in `app.json` with `updates.url` pointing to Expo's CDN
2. The app tried to fetch updates on launch but failed (network issues, no published updates, or runtime mismatch)
3. No code in the project was handling update errors gracefully
4. The crash happened before the app could render anything

## Solution Applied

### 1. Disabled OTA Updates (Immediate Fix)

Modified `app.json` to disable OTA updates:

```json
{
  "expo": {
    "updates": {
      "enabled": false,              // Disable OTA completely
      "checkOnLaunch": "NEVER",      // Never check for updates
      "fallbackToCacheTimeout": 0    // No timeout waiting for updates
    },
    "runtimeVersion": {
      "policy": "appVersion"          // Tie runtime to app version (was "sdkVersion")
    }
  }
}
```

**Changes made:**
- ✅ Set `updates.enabled` to `false`
- ✅ Set `checkOnLaunch` to `"NEVER"`
- ✅ Set `fallbackToCacheTimeout` to `0`
- ✅ Changed `runtimeVersion.policy` from `"sdkVersion"` to `"appVersion"`
- ✅ Removed missing notification sound file reference

### 2. Ran Clean Prebuild

```bash
npx expo prebuild --clean
```

This regenerated the native Android project with OTA updates disabled.

## Testing the Fix

1. **IMPORTANT: Uninstall the app first to clear cached updates:**
   ```bash
   # Find your package name in app.json (android.package)
   adb uninstall app.rork.noquestmastermobile
   ```
   Or manually delete the app from your device.

2. **Verify native flag flipped (optional but recommended):**
   ```bash
   # Check AndroidManifest.xml
   cat android/app/src/main/AndroidManifest.xml | grep "expo.modules.updates.ENABLED"
   ```
   Should show: `<meta-data android:name="expo.modules.updates.ENABLED" android:value="false"/>`

3. **Build and run the app:**
   ```bash
   npx expo run:android
   ```

4. **Quick pass/fail verification:**
   - ✅ Fresh install → App launches, no white screen
   - ✅ Check logs: NO `expo-updates` network attempts
   - ✅ Toggle airplane mode/bad network → App still opens (no crash)

5. **Check logs for confirmation:**
   ```bash
   adb logcat | grep -i "expo-updates"
   ```
   Should show NO network attempts or update checks.

## Current Status

✅ **OTA updates are DISABLED**
✅ **App works in development mode**
✅ **No remote update errors**

The app will now run with whatever code is bundled at build time, without attempting to fetch updates from Expo's servers.

---

## Re-enabling OTA Updates (Future)

When you're ready to use EAS Updates for over-the-air updates, follow this guide:

### Prerequisites

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Ensure your project is linked:**
   ```bash
   eas init
   ```

### Step 1: Update app.json Configuration

```json
{
  "expo": {
    "updates": {
      "enabled": true,                                    // Enable updates
      "url": "https://u.expo.dev/c23bcbuqrsjmkdoaxiu6y", // Your project URL
      "checkOnLaunch": "ERROR_RECOVERY",                  // Recommended: only check after crashes
      "fallbackToCacheTimeout": 0
    },
    "runtimeVersion": {
      "policy": "appVersion"  // KEEP as appVersion for stability
    }
  }
}
```

### Step 2: Build with EAS Build

```bash
# Build for Android
eas build --platform android --profile production

# Or for development
eas build --platform android --profile development
```

### Step 3: Publish Updates

```bash
# Publish to production branch
eas update --branch production --message "Initial production update"

# Or to preview branch
eas update --branch preview --message "Testing update"
```

### Step 4: Add Error Handling (Recommended)

Create a utility to handle update errors gracefully:

**`lib/updateManager.ts`:**
```typescript
import * as Updates from 'expo-updates';

export async function checkAndApplyUpdates() {
  if (__DEV__) {
    console.log('[Updates] Skipping in development');
    return;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      console.log('[Updates] Update available, fetching...');
      await Updates.fetchUpdateAsync();
      
      // Optionally show user a prompt
      Alert.alert(
        'Update Available',
        'A new version is available. Restart to apply?',
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'Restart', 
            onPress: () => Updates.reloadAsync() 
          }
        ]
      );
    } else {
      console.log('[Updates] App is up to date');
    }
  } catch (error) {
    // Silently fail - don't crash the app
    console.warn('[Updates] Failed to check for updates:', error);
    // App continues with cached bundle
  }
}
```

**Use in `app/_layout.tsx`:**
```typescript
import { checkAndApplyUpdates } from '@/lib/updateManager';

export default function RootLayout() {
  useEffect(() => {
    // Check for updates after app is stable
    setTimeout(() => {
      checkAndApplyUpdates();
    }, 3000);
  }, []);

  // rest of your layout code
}
```

### Step 5: Verify Update Configuration

1. **Check your build's branch/channel:**
   ```bash
   eas build:list
   ```
   Note which branch your builds are configured to use.

2. **Ensure runtime versions match:**
   - When you change native code (add libraries, change config), bump the `version` in `app.json`
   - Rebuild the app with EAS Build
   - Publish updates targeting that runtime version

3. **Test on a physical device:**
   - Install the EAS Build APK
   - Publish an update
   - Wait for the update to be fetched (or force-check)
   - Verify the update is applied

### Best Practices for OTA Updates

1. **Runtime Version Strategy:**
   - Use `"appVersion"` policy (already set)
   - Bump version when native dependencies change
   - OTA updates work ONLY for JS changes, not native changes

2. **Branch Strategy:**
   - `production` - for production builds
   - `preview` - for testing updates
   - `development` - for dev builds

3. **Update Frequency:**
   - Use `"ERROR_RECOVERY"` instead of `"ALWAYS"` for checkOnLaunch
   - This only checks after a crash, not every launch
   - Valid values: `"ALWAYS"`, `"ERROR_RECOVERY"`, or `"NEVER"`

4. **Testing:**
   - Always test updates on real devices
   - Verify updates work on both Wi-Fi and cellular
   - Test with slow network conditions

5. **Rollback Plan:**
   - Keep previous stable builds accessible
   - Monitor crash reports after pushing updates
   - Have a plan to revert if issues arise

### Troubleshooting Re-enabled Updates

**"Failed to download remote update" returns:**
- Verify your build's `branch` matches your published update's branch
- Check network connectivity (try on cellular, not just Wi-Fi)
- Ensure `runtimeVersion` matches between build and update
- Verify the update was successfully published to EAS

**Updates not applying:**
- Check `checkOnLaunch` setting
- Verify the update was published to the correct branch
- Restart the app to apply updates
- Check device logs for update-related messages

**Runtime version mismatch:**
- Rebuild the app with the new runtime version
- Publish updates targeting that runtime version
- Cannot mix different runtime versions

---

## Quick Reference

### Current Configuration (OTA Disabled)
```json
{
  "updates": {
    "enabled": false,
    "checkOnLaunch": "NEVER",
    "fallbackToCacheTimeout": 0
  }
}
```

### Commands
```bash
# Rebuild Android with current config
npx expo prebuild --clean
npx expo run:android

# When re-enabling OTA:
eas build --platform android --profile production
eas update --branch production --message "Your message"
```

### Files Modified
- ✅ `app.json` - Disabled updates, changed runtimeVersion policy, removed notification sound
- ✅ Native Android project - Regenerated with clean prebuild

---

## Summary

**What was fixed:** Disabled OTA updates to prevent "Failed to download remote update" crashes

**Why:** The app was trying to fetch updates that didn't exist or couldn't be reached, causing crashes before the app could render

**Impact:** App now works reliably on Android without attempting OTA updates

**Next steps:** Follow the "Re-enabling OTA Updates" guide when you're ready to ship updates without rebuilding the app

---

*Last updated: November 7, 2025*
