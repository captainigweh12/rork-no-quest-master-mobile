# REBUILD APP - Complete Fix Guide

## What This Does

This guide helps you completely rebuild the app with all caches cleared to prevent bundling errors like "Bundle key not found" and "Bundling failed without error".

## Quick Fix (Recommended)

### Linux/Mac/WSL:
```bash
bash scripts/rebuild-app.sh
```

### Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File scripts/rebuild-app.ps1
```

The script will automatically:
1. Clear all caches (.expo, .cache, node_modules/.cache)
2. Verify babel.config.js exists
3. Run diagnostics to check for issues
4. Start Expo with cache clear flag

## Manual Steps

If you prefer to run steps manually:

### 1. Clear All Caches

**Linux/Mac/WSL:**
```bash
rm -rf .expo .cache node_modules/.cache
```

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force .expo, .cache, node_modules/.cache -ErrorAction SilentlyContinue
```

### 2. Run Diagnostics

```bash
bun run diagnose
```

This will verify:
- ✓ Babel configuration is correct
- ✓ Module resolver aliases are present
- ✓ No encoding issues
- ✓ Stub files exist

**Expected output:**
```
============================================================
  CHECKING BABEL MODULE RESOLVER ALIASES
============================================================
✓ Successfully loaded babel.config.js via CJS require
Found module-resolver aliases: @, @rork-ai/toolkit-sdk, @rork-ai/toolkit-dev-sdk
✓ All required babel aliases present and correct
```

### 3. Start Expo

```bash
bun x expo start -c
```

The `-c` flag clears the Metro bundler cache on startup.

## Troubleshooting

### Issue: Diagnostic still shows "Missing aliases"

**Solution:** The babel.config.js has a debug console.log that should be removed:

```bash
# Remove the debug line manually or with sed (Linux/Mac/WSL)
sed -i "/console.log.*Using babel config/d" babel.config.js
```

### Issue: "Bundling failed without error"

This usually means stale caches. Run:

```bash
# Nuclear option - clear everything
rm -rf .expo .cache node_modules/.cache
bun install
bun x expo start -c
```

### Issue: Diagnostic loads wrong babel file

Add this to the top of your `babel.config.js` temporarily:
```js
console.log('>> Using babel config at:', __filename);
```

Then run `bun run diagnose` and verify it's loading the correct file.

### Issue: On Windows, can't run bash script

Use the PowerShell version:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/rebuild-app.ps1
```

Or use WSL:
```bash
wsl bash scripts/rebuild-app.sh
```

## What Changed

### Fixed Diagnostic Script

The diagnostic script (`scripts/bundle-diagnostics.mjs`) was improved:

1. **Better Babel config loading**: Now tries CJS require first (more reliable), then falls back to ESM import
2. **Removed duplicate checks**: Cleaned up logic that was comparing `@rork-ai/toolkit-sdk` to itself
3. **Clearer logging**: Shows which method successfully loaded the config
4. **Simplified fallback**: Text search fallback is cleaner and more accurate

### Verified Babel Config

Your `babel.config.js` is correctly configured with:
- `@`: Project root alias
- `@rork-ai/toolkit-sdk`: Rork SDK stub alias
- `@rork-ai/toolkit-dev-sdk`: Rork dev SDK stub alias

## Files Created

- `scripts/rebuild-app.sh` - Linux/Mac/WSL rebuild script
- `scripts/rebuild-app.ps1` - Windows PowerShell rebuild script
- `REBUILD_APP_GUIDE.md` - This guide

## Next Steps

1. Run the rebuild script for your platform
2. Wait for Expo to start
3. Scan the QR code or press `w` for web
4. Verify the app loads without bundling errors

If you still see issues after running the rebuild script, share the exact error message and diagnostic output.
