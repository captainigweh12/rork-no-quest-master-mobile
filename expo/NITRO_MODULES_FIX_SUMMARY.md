# NitroModules Error - Fix Summary

## Problem
```
Failed to get NitroModules: The native "NitroModules" Turbo/Native-Module could not be found.
```

## Root Cause
**Expo Go does NOT support react-native-mmkv** because it's a native JSI module that requires compilation. Expo Go is a generic runtime that can't include every possible native module.

## Solution
Switch from **Expo Go** to **Custom Development Build** (EAS Build).

---

## ✅ What Was Fixed

### 1. Updated `app.config.ts`
Added MMKV plugin and Hermes configuration:
```typescript
plugins: [
  // ... other plugins
  ['react-native-mmkv'],
],
jsEngine: 'hermes',
```

### 2. Created `eas.json`
Three build profiles configured:
- **development**: For daily development with native modules
- **preview**: For internal testing
- **production**: For app store releases

### 3. Added GitHub Actions Workflow
Automatic CI/CD pipeline (`.github/workflows/eas-build.yml`):
- Builds triggered by commit messages
- OTA updates for JS-only changes
- Supports both iOS and Android

---

## 🚀 Quick Start (5 Steps)

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login
```bash
eas login
```

### 3. Build Development Client
```bash
# For Android
eas build --platform android --profile development

# For iOS
eas build --platform ios --profile development
```

**Wait time**: 15-20 minutes for first build

### 4. Install the Built App
- **Android**: Download APK from EAS dashboard and install
- **iOS**: Download for simulator or use TestFlight link

### 5. Run Development Server
```bash
npx expo start --dev-client
```

Scan QR code with your custom dev client app → **MMKV now works!** ✨

---

## 📱 Key Differences

| Feature | Expo Go | Custom Dev Build |
|---------|---------|------------------|
| Native Modules (MMKV) | ❌ No | ✅ Yes |
| Setup Time | Instant | 15-20 min first build |
| Hot Reload | ✅ Yes | ✅ Yes |
| Need to Rebuild | Never | Only for native changes |
| Distribution | QR code only | QR, TestFlight, APK |

---

## 💡 When to Rebuild

### ❌ Don't Rebuild For:
- JavaScript/TypeScript code changes
- UI updates
- Business logic changes
- Asset changes (images, fonts)

**→ Just use `npx expo start --dev-client`**

### ✅ Rebuild For:
- Adding/removing native modules
- Changing app.config.ts plugins
- Updating native dependencies
- Changing permissions

**→ Run `eas build` again**

---

## 🔄 Development Workflow

```bash
# Day-to-day development (JS changes only)
npx expo start --dev-client

# Added a new native module? Rebuild:
eas build --platform android --profile development

# Ready to test with others? Build preview:
eas build --platform android --profile preview

# Going to production? 
eas build --platform android --profile production
```

---

## 🤖 GitHub Actions Setup

### Add Secret to GitHub
1. Go to https://expo.dev/accounts/[your-username]/settings/access-tokens
2. Create a new token
3. GitHub Repo → Settings → Secrets → Actions
4. Add secret: `EXPO_TOKEN`

### Trigger Builds with Commit Messages
```bash
# Build development client
git commit -m "Added new feature [build]"

# Build preview
git commit -m "Ready for testing [preview]"

# Just OTA update (JS only)
git commit -m "Bug fix"
```

---

## 📖 Full Documentation

For detailed setup instructions, see: **MMKV_CUSTOM_DEV_CLIENT_SETUP.md**

---

## 🎯 Success Criteria

You'll know it's working when:
- [x] Build completes successfully in EAS
- [x] Custom dev client installs on your device
- [x] App connects to dev server via QR code
- [x] No more "NitroModules" error
- [x] MMKV storage operations work
- [x] Hot reload still functions

---

## ❓ Common Questions

**Q: Can I still use Expo Go for other projects?**  
A: Yes! Use custom dev builds only for projects with native modules.

**Q: Does this cost money?**  
A: EAS Build has a free tier. Check https://expo.dev/pricing

**Q: How long do builds take?**  
A: First build: 15-20 min. Subsequent builds: 5-10 min.

**Q: Can I develop on the web?**  
A: Yes, but MMKV won't work on web (it's native-only). Use conditional fallback to AsyncStorage for web.

**Q: Do I need a Mac for iOS builds?**  
A: No! EAS Build handles iOS builds in the cloud.

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "NitroModules" error persists | Ensure you're using custom dev client, NOT Expo Go |
| Build fails | Check `eas build:list` for error logs |
| Can't connect to dev server | Try tunnel mode: `npx expo start --dev-client --tunnel` |
| iOS requires Apple account | Simulator builds don't need it. Device builds do. |

---

## 📦 What's Included

- ✅ `app.config.ts` - Updated with MMKV plugin
- ✅ `eas.json` - Build profiles configuration
- ✅ `.github/workflows/eas-build.yml` - CI/CD automation
- ✅ `MMKV_CUSTOM_DEV_CLIENT_SETUP.md` - Complete guide
- ✅ This summary document

---

**Ready to build?** Run: `eas build --platform android --profile development`
