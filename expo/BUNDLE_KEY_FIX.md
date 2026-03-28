## Bundle Key Not Found - Fix Guide

### Root Cause
The "Bundle key not found" error occurs because:
1. React 18.2.0 is installed but expo-router 6.x + React Native 0.76.3 expect React 19
2. The metro bundler can't generate bundles due to React version mismatch
3. expo-router is trying to use `React.use()` which only exists in React 19

### Solution

You have two options:

#### Option 1: Quick Fix (Recommended for Expo Go)
Clear caches and let the bundler auto-recover:

```bash
# Make the script executable
chmod +x fix-bundle-error.sh

# Run the fix script
./fix-bundle-error.sh
```

Or manually:
```bash
# Kill processes
pkill -f "metro" || true
pkill -f "expo" || true

# Clear caches
rm -rf .expo .cache node_modules/.cache
rm -rf $TMPDIR/metro-* $TMPDIR/haste-map-* $TMPDIR/react-* 2>/dev/null || true

# Clear watchman (if installed)
watchman watch-del-all || true

# Reinstall
bun install

# Start fresh
bun x expo start -c
```

#### Option 2: Fix React Version Mismatch
The package.json has React 18.2.0 but React Native 0.76.3 requires React 19.

**Note**: React 19 requires a custom dev client and won't work with Expo Go.

Since you're using Expo Go, you need to either:
1. Downgrade React Native to 0.75.x (compatible with React 18), or
2. Keep current versions and build a custom dev client

For Expo Go compatibility, the package.json should use:
- expo: ~54.0.0
- react: 18.3.1
- react-dom: 18.3.1  
- react-native: 0.75.x
- expo-router: ~4.0.0 (v4 works with React 18)

### Files Fixed
- ✅ Created `lib/updateManager.native.ts` (missing file)
- ✅ Created `lib/updateManager.web.ts` (missing file)
- ✅ Updated `app/update-debug.tsx` to use correct import

### Next Steps
1. Run `./fix-bundle-error.sh` or the manual commands above
2. If the error persists, check the Metro bundler output for specific module errors
3. Make sure no other Expo/Metro processes are running in background
