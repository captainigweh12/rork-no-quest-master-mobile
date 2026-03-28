# 🛡️ RORK Health Guard - Complete Setup Guide

## Overview

The RORK Health Guard is a pre-startup health check system that catches encoding issues, cache corruption, and storage problems **before** Metro even starts. It's integrated with the runtime storage health guard for comprehensive protection.

## ✅ Installation Complete

The following has been added to your `package.json`:

```json
{
  "scripts": {
    "rork:guard": "node scripts/rork-health-guard.mjs",
    "rork:guard:fix": "node scripts/rork-health-guard.mjs --fix",
    "rork:clean": "node scripts/rork-health-guard.mjs --clean-only",
    "dev": "npm run rork:guard && dotenv -e .env -- expo start -c",
    "dev:fix": "npm run rork:guard:fix && dotenv -e .env -- expo start -c"
  }
}
```

## 🎯 What It Does

### Pre-Startup Checks (Build Time)

The health guard runs **before** Metro starts and checks:

1. **Encoding Issues**
   - Detects UTF-16 files (should be UTF-8)
   - Strips UTF-8 BOMs (Byte Order Marks)
   - Auto-converts with `--fix` flag

2. **JSON Validation**
   - Validates package.json, tsconfig.json, eas.json
   - Catches malformed JSON before build

3. **TypeScript Compilation**
   - Runs `tsc --noEmit` check
   - Detects type errors early

4. **Import Resolution**
   - Scans for broken relative imports
   - Catches missing files before runtime

5. **Cache Cleanup**
   - Removes `.expo`, `.expo-shared`, Metro cache
   - Clears all build artifacts with `--fix`

6. **Storage Health Integration**
   - Detects AsyncStorage setup
   - Confirms runtime storage guard presence
   - Reports storage protection status

### Runtime Protection (App Startup)

The runtime storage guard in `lib/emergencyStorageClear.ts`:

1. **Corruption Detection**
   - Detects semicolon corruption patterns
   - Identifies control character corruption
   - Catches malformed JSON in storage

2. **Auto-Repair**
   - Removes corrupted keys automatically
   - Clears all AsyncStorage if needed
   - Prevents SyntaxError crashes

3. **Graceful Degradation**
   - Logs detailed error information
   - Provides user-facing recovery instructions
   - Never crashes the app

## 📋 Commands

### Development (Recommended)

```bash
# Start with health check (stops if issues found)
npm run dev

# Start with auto-fix (converts encodings + clears caches)
npm run dev:fix
```

### Standalone Commands

```bash
# Run health check only (read-only)
npm run rork:guard

# Auto-fix encoding issues + clear caches
npm run rork:guard:fix

# Clean caches only (no checks)
npm run rork:clean
```

### Legacy Start (No Guard)

```bash
# Original start command (no health check)
npm start
```

## 🔍 Exit Codes

- **Exit 0**: All checks passed ✅
- **Exit 1**: Issues found (Metro won't start) ❌

When the guard finds problems:
- In **read-only mode**: Lists issues, exits with code 1
- In **fix mode**: Attempts repairs, exits with code 1 if unrepairable

## 🚨 Common Issues & Fixes

### Issue: UTF-16 Encoding Detected

**Symptom:**
```
✖ UTF-16 file: app.config.ts (run with --fix to convert)
```

**Fix:**
```bash
npm run rork:guard:fix
```

### Issue: UTF-8 BOM Detected

**Symptom:**
```
✖ UTF-8 BOM detected: package.json (run with --fix to strip)
```

**Fix:**
```bash
npm run rork:guard:fix
```

### Issue: TypeScript Errors

**Symptom:**
```
✖ TypeScript errors detected (tsc --noEmit failed)
```

**Fix:**
```bash
# View errors
npx tsc --noEmit

# Fix the reported TypeScript errors
```

### Issue: Metro Cache Corruption

**Symptom:**
- Metro fails to start
- "Unexpected token" errors
- Random syntax errors

**Fix:**
```bash
# Clean all caches
npm run rork:clean

# Or use dev:fix to clean + check
npm run dev:fix
```

### Issue: AsyncStorage Corruption

**Symptom:**
- App crashes on startup with SyntaxError
- "Unexpected token ';'" in storage values
- "':' expected" parsing errors

**Fix:**
The runtime storage guard handles this automatically:
1. Detects corrupted keys at app startup
2. Removes corrupted values
3. App continues normally

**Manual Clear (if needed):**
Navigate in-app to `/emergency-clear` or use device settings to clear app data.

## 🔗 Integration with Storage Guard

The health guard works with `lib/emergencyStorageClear.ts`:

```
┌──────────────────────────────────────────┐
│  RORK Health Guard (Build Time)          │
│  ├─ Encoding checks                      │
│  ├─ JSON validation                      │
│  ├─ TypeScript compilation               │
│  ├─ Import resolution                    │
│  └─ Cache cleanup                        │
└──────────────────────────────────────────┘
             │
             ▼ Metro Starts
             │
┌──────────────────────────────────────────┐
│  App Initialization                      │
└──────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Storage Health Guard (Runtime)          │
│  ├─ Corruption detection                 │
│  ├─ Auto-repair corrupted keys           │
│  ├─ Emergency clear if needed            │
│  └─ Graceful error handling              │
└──────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  App Runs Normally                       │
└──────────────────────────────────────────┘
```

## 💡 Best Practices

### 1. Use `dev` Commands for Daily Development

```bash
# Your new normal start command
npm run dev
```

- Catches issues before they cause problems
- Faster feedback loop
- Prevents "it works on my machine" issues

### 2. Use `dev:fix` After Pulling Changes

```bash
# After git pull
npm run dev:fix
```

- Fixes any encoding issues from other developers
- Clears stale caches
- Ensures clean development environment

### 3. Use `rork:clean` When Stuck

```bash
# When Metro acts weird
npm run rork:clean
npm start
```

- Nuclear option for cache issues
- Clears ALL build artifacts
- Fresh slate for Metro

### 4. Monitor Storage Health Logs

Check development console for:
```
[EMERGENCY] 🚨 Nuclear storage clear initiated
✓ Storage health guard detected - will run at app startup
```

These logs indicate storage protection is active.

## 🧪 Testing the Setup

### Test 1: Health Check Passes

```bash
npm run rork:guard
# Should output: ✓ RORK Health Guard passed — environment looks clean.
```

### Test 2: Auto-Fix Works

1. Manually create a UTF-16 file (use Notepad on Windows, save as UTF-16)
2. Run:
```bash
npm run rork:guard:fix
# Should output: ✔ converted to UTF-8: <filename>
```

### Test 3: Dev Command Works

```bash
npm run dev
# Should run health check, then start Metro
```

### Test 4: Storage Guard Active

Check app startup logs for:
```
[EMERGENCY] Step 1: Skipping SQLite clear
[EMERGENCY] Step 2: Clearing AsyncStorage...
AsyncStorage detected - runtime storage health guard active
```

## 🔧 Customization

### Add More Critical Files

Edit `scripts/rork-health-guard.mjs`:

```javascript
const MUST_BE_UTF8 = [
  'app.config.ts',
  'babel.config.js',
  'tsconfig.json',
  // Add your critical files here
  'my-custom-config.json'
];
```

### Add More Cache Directories

```javascript
const targets = [
  '.expo',
  '.expo-shared',
  'node_modules/.cache',
  // Add custom cache dirs
  'my-custom-cache'
];
```

### Skip TypeScript Check

Remove or comment out in `scripts/rork-health-guard.mjs`:

```javascript
// Skip this block if you don't want tsc check
// if (exists(path.join(PROJECT_ROOT, 'tsconfig.json'))) {
//   const tsc = spawnSync(...);
//   ...
// }
```

## 📊 Exit 1 Scenarios

The guard exits with code 1 (stops Metro) when:

1. ❌ UTF-16 encoding detected (without `--fix`)
2. ❌ UTF-8 BOM present (without `--fix`)
3. ❌ Invalid JSON in critical files
4. ❌ TypeScript compilation errors
5. ❌ Missing import files detected
6. ❌ Native modules in Expo Go mode

## ✅ Success Indicators

When everything is healthy:

```bash
npm run dev

# Output:
Running RORK Health Guard…
MMKV detected.
AsyncStorage detected - runtime storage health guard active
✓ Storage health guard detected - will run at app startup
  - Handles AsyncStorage corruption detection
  - Auto-clears corrupted keys on startup
  - Failsafe for SyntaxError in storage values
✓ RORK Health Guard passed — environment looks clean.

# Then Metro starts...
```

## 🚀 Quick Start Checklist

- [x] Scripts added to package.json
- [x] Run `npm run rork:guard` to verify setup
- [x] Use `npm run dev` for development
- [x] Use `npm run dev:fix` after git pull
- [x] Storage guard automatically active at runtime
- [x] Emergency clear available at `/emergency-clear` route

## 🆘 Emergency Recovery

If the app won't start despite health guard:

1. **Clear Everything:**
   ```bash
   npm run rork:clean
   rm -rf node_modules
   npm install
   npm run dev:fix
   ```

2. **Clear Device Storage:**
   - iOS: Settings → General → iPhone Storage → [App] → Delete App
   - Android: Settings → Apps → [App] → Storage → Clear Data

3. **Nuclear Option:**
   ```bash
   git clean -fdx
   npm install
   npm run dev:fix
   ```

## 📝 Summary

You now have **two layers of protection**:

1. **Pre-Startup (Build Time)**: RORK Health Guard catches issues before Metro starts
2. **Runtime (App Startup)**: Storage Health Guard handles corrupted AsyncStorage

**Your new workflow:**
```bash
npm run dev      # Daily development (with health check)
npm run dev:fix  # After git pull or when cache acts up
```

The system will:
- ✅ Prevent encoding issues from breaking builds
- ✅ Catch TypeScript errors early
- ✅ Clear stale caches automatically
- ✅ Detect and repair corrupted storage
- ✅ Never crash due to storage corruption
- ✅ Provide clear error messages and fixes

## 🎉 Benefits

- **Faster debugging**: Issues caught before they cause problems
- **Cleaner dev experience**: No more mysterious Metro failures
- **Team consistency**: Same encoding across all developers
- **Storage resilience**: App survives AsyncStorage corruption
- **Zero crashes**: Graceful degradation on errors
- **Better DX**: Clear error messages with suggested fixes
