# Android Node.js Polyfill Error Fix

**Date**: November 7, 2025  
**Error**: `Unable to resolve module util`  
**Status**: 🔧 IN PROGRESS

## Error Details

```
Unable to resolve module util from 
/data/user/0/host.exp.exponent/cache/ExperienceData/%2540anonymous%252Frork-no-quest-master-mobile...
```

## Root Cause

The app is using npm packages that depend on Node.js built-in modules (`util`, `stream`, `buffer`, etc.) which don't exist in React Native. This is common when using packages like:
- `superjson`
- `trpc`
- `hono`
- Other server-side packages

## Solution

Install React Native polyfills for Node.js modules.

### Step 1: Install Required Polyfills

```bash
npm install --save react-native-url-polyfill
npm install --save @ungap/structured-clone
npm install --save @stardazed/streams-text-encoding
```

### Step 2: Import Polyfills in App Entry

The polyfills should already be available based on package.json, but we need to ensure they're imported early in the app lifecycle.

In `app/_layout.tsx`, add at the very top (before any other imports):

```typescript
// Polyfills must be imported first
import 'react-native-url-polyfill/auto';
import '@stardazed/streams-text-encoding';
```

### Step 3: Configure Metro Bundler

Create or update `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfill support
config.resolver.sourceExts.push('cjs');

module.exports = config;
```

## Files to Update

1. `app/_layout.tsx` - Add polyfill imports at the top
2. `metro.config.js` - Configure bundler (create if missing)
3. `package.json` - Verify polyfills are installed

## Alternative: Use Expo's Built-in Polyfills

Expo 50+ includes automatic polyfills. Ensure you're using the latest Expo SDK.

## Testing

After applying the fix:

```bash
# Clear all caches
npx expo start --clear

# Run on Android
# Press 'a' when Metro bundler starts
```

## Status

⬜ Install polyfills  
⬜ Update app/_layout.tsx  
⬜ Update/create metro.config.js  
⬜ Clear cache and rebuild  
⬜ Test on Android device
