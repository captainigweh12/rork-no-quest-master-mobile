# iOS/Android Bundling Error Diagnosis

**Date:** 2025-11-11
**Issue:** iOS bundling errors, Android app not loading

## Files Analyzed

✅ app.config.ts
✅ babel.config.js  
✅ metro.config.js
✅ tsconfig.json
✅ react-native.config.js (not present - OK for Expo)
✅ Platform-specific files (none found - OK)
✅ android/build.gradle
✅ android/app/build.gradle
✅ android/gradle.properties
✅ ios/ (empty folder)

---

## 🚨 CRITICAL ISSUES FOUND

### 1. **Metro/Babel Configuration Mismatch**

**Problem:** File extension inconsistency between Metro and Babel configurations.

**metro.config.js:**
```javascript
config.resolver.extraNodeModules = {
  '@rork-ai/toolkit-sdk': path.resolve(__dirname, 'stubs/rork-toolkit-sdk.ts'),     // ❌ Has .ts
  '@rork-ai/toolkit-dev-sdk': path.resolve(__dirname, 'stubs/rork-ai-toolkit-dev-sdk.ts'), // ❌ Has .ts
};
```

**babel.config.js:**
```javascript
alias: {
  '@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk',           // ✅ No extension
  '@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk', // ✅ No extension
}
```

**Impact:** This mismatch can cause Metro bundler to fail resolving modules correctly, leading to bundling errors.

**Fix:** Remove `.ts` extensions from metro.config.js to match babel.config.js

---

### 2. **Hardcoded Web-Only Path in tsconfig.json**

**Problem:** The tsconfig.json has a platform-specific path that forces web implementation:

```json
"@/contexts/dailyClient": ["./contexts/dailyClient.web.ts"]
```

**Impact:** 
- On iOS/Android, the app will try to import the web version of dailyClient
- This breaks platform detection and causes runtime errors on native platforms
- The app won't load properly on mobile devices

**Fix:** Remove this hardcoded path and let the module resolution handle platform-specific imports automatically

---

### 3. **iOS Folder Empty (Prebuild Required)**

**Status:** The `ios/` directory is empty

**Impact:** Cannot build for iOS without running prebuild first

**Fix:** Run `npx expo prebuild` to generate iOS native files

---

## ⚠️ POTENTIAL ISSUES

### 4. **New Architecture Enabled**

**Current State:**
- `app.config.ts`: `newArchEnabled: true`
- `android/gradle.properties`: `newArchEnabled=true`

**Considerations:**
- New Architecture (Fabric/TurboModules) can cause compatibility issues with older dependencies
- Some libraries may not fully support the new architecture yet
- Can cause bundling/runtime errors if dependencies aren't compatible

**Recommendation:** If bundling issues persist, consider temporarily disabling:
```typescript
// app.config.ts
newArchEnabled: false
```
```properties
# android/gradle.properties
newArchEnabled=false
```

---

### 5. **Module Resolution Configuration**

**babel.config.js extensions:**
```javascript
extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
```

**metro.config.js sourceExts:**
```javascript
config.resolver.sourceExts.push('cjs', 'mjs');
```

**Status:** ✅ Looks reasonable, but missing native extensions

**Recommendation:** Consider adding platform-specific extensions to Metro:
```javascript
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'cjs', 'mjs'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
```

---

## 🔧 IMMEDIATE FIXES REQUIRED

### Fix 1: Update metro.config.js

Remove file extensions from stub paths:

```javascript
config.resolver.extraNodeModules = {
  '@rork-ai/toolkit-sdk': path.resolve(__dirname, 'stubs/rork-toolkit-sdk'),
  '@rork-ai/toolkit-dev-sdk': path.resolve(__dirname, 'stubs/rork-ai-toolkit-dev-sdk'),
};
```

### Fix 2: Update tsconfig.json

Remove the hardcoded web path:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@rork-ai/toolkit-sdk": ["./stubs/rork-toolkit-sdk.ts"],
      "@rork-ai/toolkit-dev-sdk": ["./stubs/rork-ai-toolkit-dev-sdk.ts"]
      // Remove: "@/contexts/dailyClient": ["./contexts/dailyClient.web.ts"]
    }
  }
}
```

### Fix 3: Run Prebuild for iOS

```bash
npx expo prebuild --clean
```

---

## 📋 RECOMMENDED TESTING SEQUENCE

After applying fixes:

1. **Clear caches:**
   ```bash
   npx expo start -c
   ```

2. **Test Android:**
   ```bash
   npx expo run:android
   ```

3. **Test iOS (after prebuild):**
   ```bash
   npx expo run:ios
   ```

4. **If issues persist, try without new architecture:**
   - Set `newArchEnabled: false` in app.config.ts
   - Set `newArchEnabled=false` in android/gradle.properties
   - Run `npx expo prebuild --clean`
   - Test again

---

## 📝 ADDITIONAL CHECKS

### Verify Stub Files Exist

Ensure these files are present and exportable:
- `stubs/rork-toolkit-sdk.ts`
- `stubs/rork-ai-toolkit-dev-sdk.ts`

### Verify Daily Client Files

Ensure platform-specific files exist:
- `contexts/dailyClient.native.ts` (for iOS/Android)
- `contexts/dailyClient.web.ts` (for web)

### Check Package.json Scripts

Verify Expo CLI commands are up to date in package.json

---

## 🎯 ROOT CAUSE ANALYSIS

The bundling errors are likely caused by:

1. **Primary:** Metro/Babel path resolution mismatch (different file extensions)
2. **Secondary:** Hardcoded web-only import path breaking native platforms
3. **Tertiary:** iOS folder not prebuilt (preventing iOS builds)
4. **Possible:** New Architecture compatibility issues with dependencies

## 🔍 NEXT STEPS

1. Apply Fix 1 (metro.config.js) - **CRITICAL**
2. Apply Fix 2 (tsconfig.json) - **CRITICAL**  
3. Apply Fix 3 (Run prebuild for iOS) - **REQUIRED for iOS**
4. Test on both platforms
5. If issues persist, disable new architecture and test again
6. Check dependency compatibility with new architecture

---

## Status: ✅ FIXES APPLIED

**Verification Date:** 2025-11-11 (Second Look Analysis)

### Critical Fixes Applied:

✅ **Fix 1: Metro/Babel Configuration Mismatch - RESOLVED**
- Removed `.ts` extensions from `metro.config.js` stub paths
- Now matches Babel configuration (no extensions)
- Added platform-specific resolver: `['ios', 'android', 'native', 'web']`

**Before:**
```javascript
'@rork-ai/toolkit-sdk': path.resolve(__dirname, 'stubs/rork-toolkit-sdk.ts'),
```

**After:**
```javascript
'@rork-ai/toolkit-sdk': path.resolve(__dirname, 'stubs/rork-toolkit-sdk'),
```

✅ **Fix 2: Hardcoded Web-Only Path - RESOLVED**
- Removed `"@/contexts/dailyClient": ["./contexts/dailyClient.web.ts"]` from `tsconfig.json`
- Platform resolution now automatic via Metro's platform extensions
- Native builds will correctly use `dailyClient.native.ts`

**Current tsconfig.json paths:**
```json
"paths": {
  "@/*": ["./*"],
  "@rork-ai/toolkit-sdk": ["./stubs/rork-toolkit-sdk.ts"],
  "@rork-ai/toolkit-dev-sdk": ["./stubs/rork-ai-toolkit-dev-sdk.ts"]
}
```

✅ **Verified File Existence:**
- ✅ `stubs/rork-toolkit-sdk.ts` exists
- ✅ `stubs/rork-ai-toolkit-dev-sdk.ts` exists
- ✅ `contexts/dailyClient.native.ts` exists
- ✅ `contexts/dailyClient.web.ts` exists

### Configuration Validation:

✅ **metro.config.js** - No errors, correctly configured
✅ **tsconfig.json** - No errors, platform-neutral paths
✅ **babel.config.js** - No errors, aliases match Metro

### Remaining Action Items:

⚠️ **Fix 3: iOS Prebuild** (Still Required)
```bash
npx expo prebuild --clean
```

### Ready for Testing

All critical configuration issues have been resolved. The app is now ready for platform-specific testing:

1. **For Web:**
   ```bash
   bun run start-web
   ```

2. **For Android:**
   ```bash
   npx expo run:android
   ```

3. **For iOS (after prebuild):**
   ```bash
   npx expo prebuild --clean
   npx expo run:ios
   ```

### Additional Improvements Made:

- Added runtime guard in `DailyContext` with `isSupported` and `supportReason`
- Implemented `EXPO_PUBLIC_DAILY_ENABLED` feature flag
- Created `LIVE_STREAMING_PLATFORM_NOTES.md` documentation
- Added platform-specific resolver configuration in Metro

---

## Status: Ready for Fixes

All configuration files have been analyzed. The issues are clear and the fixes are straightforward. Applying these fixes should resolve the bundling errors on both iOS and Android.
