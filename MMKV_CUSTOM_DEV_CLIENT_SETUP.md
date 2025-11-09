# MMKV Custom Development Build Setup Guide

## Problem Summary

The error `Failed to get NitroModules: The native "NitroModules" Turbo/Native-Module could not be found` occurs because **Expo Go does not support native modules like react-native-mmkv**. MMKV is a JSI (JavaScript Interface) module that requires native code compilation.

## Solution: Use Custom Development Builds

Instead of Expo Go, you need to use a **Custom Development Build** which includes all your native dependencies compiled into the app.

---

## ✅ What's Been Done

The following configuration has been completed:

1. ✅ **Added MMKV plugin to app.config.ts**
   - Plugin: `['react-native-mmkv']`
   - Hermes engine configured: `jsEngine: 'hermes'`

2. ✅ **Created eas.json** with three build profiles:
   - **development**: For testing with custom dev client
   - **preview**: For internal testing/distribution
   - **production**: For App Store/Play Store releases

3. ✅ **Set up GitHub Actions workflow** (`.github/workflows/eas-build.yml`)
   - Automatic builds triggered by commit messages
   - OTA updates for JS-only changes

---

## 🚀 Next Steps

### Step 1: Install EAS CLI Globally

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials. If you don't have an account, create one at https://expo.dev

### Step 3: Configure Your Project

```bash
# Verify your project is linked to EAS
eas whoami

# Check your project configuration
npx expo config --type public
```

### Step 4: Build Your Custom Development Client

#### For Android (APK):
```bash
eas build --platform android --profile development
```

#### For iOS (Simulator):
```bash
eas build --platform ios --profile development
```

#### For both platforms:
```bash
eas build --platform all --profile development
```

**Note**: The first build takes longer (15-20 minutes). Subsequent builds are faster.

### Step 5: Install the Development Client

#### Android:
1. Once the build completes, you'll get a download link
2. Download the APK to your Android device
3. Install it (you may need to enable "Install from Unknown Sources")

#### iOS:
1. For simulator builds, download and install in your iOS Simulator
2. For device builds, you'll get a TestFlight link or direct download link
3. Install the app on your device

### Step 6: Run Your Development Server

```bash
# Start the development server
npx expo start --dev-client

# Or use your custom script
npm run start
```

### Step 7: Connect to Your Development Build

1. Open the custom development client app on your device
2. Scan the QR code from the terminal
3. Your app will load with **MMKV fully working**! 🎉

---

## 📱 Development Workflow

### For JS-Only Changes
When you make JavaScript/TypeScript changes that don't affect native code:

```bash
npm run start
```

The dev client will hot-reload your changes automatically.

### For Native Changes
When you change native dependencies or plugins in app.config.ts:

```bash
# Rebuild the development client
eas build --platform android --profile development
# or
eas build --platform ios --profile development
```

---

## 🤖 GitHub Actions CI/CD

### Automatic Builds

The workflow triggers automatically based on commit messages:

#### Build Development Client:
```bash
git commit -m "Added new native module [build]"
git push
```

#### Build Preview (for testing):
```bash
git commit -m "Ready for internal testing [preview]"
git push
```

#### OTA Update (JS only):
```bash
git commit -m "Fixed UI bug"
git push
# This triggers an OTA update automatically
```

### Required GitHub Secret

Add `EXPO_TOKEN` to your repository secrets:

1. Generate a token: https://expo.dev/accounts/[your-username]/settings/access-tokens
2. Go to GitHub repo → Settings → Secrets → Actions
3. Add new secret: `EXPO_TOKEN` = your token

---

## 🔧 Build Profiles Explained

### Development Profile
- **Purpose**: Day-to-day development
- **Features**: 
  - Includes dev tools
  - Fast refresh enabled
  - Can load from dev server
  - Includes all native modules (MMKV works!)
- **Distribution**: Internal only
- **File**: APK (Android) / Simulator (iOS)

### Preview Profile
- **Purpose**: Share with testers
- **Features**:
  - Production-like build
  - No dev tools
  - More optimized
- **Distribution**: Internal testing
- **File**: APK (Android) / IPA (iOS)

### Production Profile  
- **Purpose**: App Store/Play Store submission
- **Features**:
  - Fully optimized
  - Smallest bundle size
  - Release signing
- **Distribution**: Public app stores
- **File**: AAB (Android) / IPA (iOS)

---

## 📋 Quick Reference Commands

```bash
# Build development client
eas build --platform android --profile development
eas build --platform ios --profile development

# Build preview
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Publish OTA update
eas update --branch main --message "Bug fixes"

# Run dev server with custom client
npx expo start --dev-client

# Check build status
eas build:list

# View logs of a specific build
eas build:view [build-id]
```

---

## 🐛 Troubleshooting

### "Could not find NitroModules" still appears

**Solution**: Make sure you're using the **custom development client**, not Expo Go. Expo Go cannot run MMKV.

### Build fails with "No Expo account found"

**Solution**: 
```bash
eas login
```

### Android build fails

**Solution**: Check that your `app.json` or `app.config.ts` has a valid `android.package` set.

### iOS build requires Apple Developer account

**Solution**: 
- For simulator builds: No Apple account needed
- For device builds: You need an Apple Developer account ($99/year)

### Dev client won't connect

**Solution**:
1. Ensure your device and computer are on the same network
2. Try using tunnel mode: `npx expo start --dev-client --tunnel`

---

## 📚 Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Custom Development Clients](https://docs.expo.dev/develop/development-builds/introduction/)
- [react-native-mmkv Documentation](https://github.com/mrousavy/react-native-mmkv)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)

---

## ✨ Benefits of This Setup

✅ **MMKV Works**: Native modules compile into your app  
✅ **Fast Development**: Hot reload still works  
✅ **CI/CD Ready**: Automated builds on push  
✅ **OTA Updates**: Push JS updates without rebuilding  
✅ **TestFlight/Internal Testing**: Easy distribution  
✅ **Production Ready**: Same pipeline for releases  

---

## 🎯 Next Actions Checklist

- [ ] Install EAS CLI globally: `npm install -g eas-cli`
- [ ] Login to Expo: `eas login`
- [ ] Build development client: `eas build --platform android --profile development`
- [ ] Install the built APK/IPA on your device
- [ ] Run dev server: `npx expo start --dev-client`
- [ ] Test MMKV functionality
- [ ] Set up GitHub Actions secret: `EXPO_TOKEN`
- [ ] Make a test commit with `[build]` to trigger CI

---

**Need Help?** Check the [Expo Discord](https://chat.expo.dev) or [GitHub Discussions](https://github.com/expo/expo/discussions)
