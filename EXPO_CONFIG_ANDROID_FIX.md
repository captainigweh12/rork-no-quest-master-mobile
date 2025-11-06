# Expo Android Configuration Fix

## Problem
The app was throwing errors when building for Android:
```
Could not parse Expo config: android.googleServicesFile: "./google-services.json"
Warning: Unable to resolve manifest assets. Icons and fonts might not work. Cannot read properties of null (reading '0').
```

## Root Causes

### 1. Missing google-services.json
The `app.json` file referenced a `google-services.json` file that didn't exist in the project:
```json
"android": {
  "googleServicesFile": "./google-services.json"
}
```

### 2. Missing Notification Assets
The expo-notifications plugin referenced assets that didn't exist:
- `./assets/images/notification-icon.png` - Missing
- `./assets/sounds/notification_sound.wav` - Missing

## Fixes Applied

### 1. Removed google-services.json Reference
✅ **Removed** the `googleServicesFile` property from the android configuration in `app.json`

**Note:** The `google-services.json` file is only needed if you're using Firebase services (FCM, Analytics, etc.). If you need Firebase:
1. Set up Firebase project at https://console.firebase.google.com/
2. Download `google-services.json` for your Android app
3. Place it in the project root
4. Re-add `"googleServicesFile": "./google-services.json"` to app.json

### 2. Fixed Notification Assets
✅ **Changed** the notification icon to use the existing `icon.png` file
✅ **Removed** the custom sounds array (will use default notification sound)

**Before:**
```json
{
  "icon": "./assets/images/notification-icon.png",
  "color": "#ffffff",
  "defaultChannel": "default",
  "sounds": [
    "./assets/sounds/notification_sound.wav"
  ]
}
```

**After:**
```json
{
  "icon": "./assets/images/icon.png",
  "color": "#ffffff",
  "defaultChannel": "default"
}
```

## Testing

To verify the fix works:

```bash
# Clear any cached configuration
npx expo start --clear

# For Android build
npx expo prebuild --platform android --clean

# Or run on Android
npx expo run:android
```

## Next Steps (Optional)

### If You Need Custom Notification Assets

1. **Create notification icon:**
   ```bash
   # Place a 96x96 PNG with transparent background at:
   # assets/images/notification-icon.png
   ```

2. **Create notification sound:**
   ```bash
   # Place a WAV file at:
   # assets/sounds/notification_sound.wav
   ```

3. **Update app.json:**
   ```json
   "expo-notifications": {
     "icon": "./assets/images/notification-icon.png",
     "sounds": ["./assets/sounds/notification_sound.wav"]
   }
   ```

### If You Need Firebase/Google Services

1. Create Firebase project: https://console.firebase.google.com/
2. Add Android app with package name: `app.rork.noquestmastermobile`
3. Download `google-services.json`
4. Place in project root
5. Add to app.json:
   ```json
   "android": {
     "googleServicesFile": "./google-services.json"
   }
   ```

## Summary
✅ Removed non-existent google-services.json reference
✅ Fixed notification plugin to use existing assets
✅ Configuration should now build without errors

The app can now build for Android without the configuration errors!
