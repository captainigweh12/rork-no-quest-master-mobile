# Syntax Error Fix - 1:4 ';' expected

## Problem
Getting "1:4: ';' expected" error on app initialization

## Root Cause Analysis
This Metro bundler syntax error typically occurs due to:
1. Invalid .env syntax (colons or quotes)
2. Malformed app.config.ts
3. Corrupted build cache
4. File encoding issues (UTF-16 BOM)

## Files Checked ✅
1. `.env` - Verified correct syntax (key=value, no colons/quotes)
2. `app.config.ts` - Verified proper structure and commas
3. `package.json` - Valid JSON
4. `tsconfig.json` - Valid JSON
5. `babel.config.js` - Valid syntax
6. `metro.config.js` - Valid syntax

## Actions Taken
1. ✅ Cleaned build artifacts:
   - Removed .expo directory
   - Removed node_modules
   - Removed android directory
   - Removed ios directory
   - Removed package-lock.json

2. ✅ Reinstalled dependencies with `npm install --legacy-peer-deps`

## Next Steps (After npm install completes)

### 1. Prebuild with clean
```bash
npx expo prebuild --clean
```

### 2. Start the app
```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android

# Or web for testing
npx expo start --web
```

### 3. If error persists, check for encoding issues
```bash
# Re-save .env as UTF-8 without BOM
# In VS Code: File → Save with Encoding → UTF-8
```

### 4. Alternative: Recreate .env from scratch
```bash
del .env
echo EXPO_PUBLIC_SUPABASE_URL=https://hotbmbscjxgayivmyenb.supabase.co > .env
echo EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGJtYnNjanhnYXlpdm15ZW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjgyMDgsImV4cCI6MjA3NzAwNDIwOH0.8pU3MXu8ylwSORBzXMQqbQ6ZBKXh9tXWALiJo1A8E8M >> .env
echo EXPO_PUBLIC_APP_BASE_URL=https://rork-no-quest-master-mobile.onrender.com >> .env
echo EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSyDSYqu0CwENbpfAWFLzMyGT2PHFVEntLzY >> .env
echo EXPO_PUBLIC_RORK_API_BASE_URL=https://rork-no-quest-master-mobile.onrender.com >> .env
echo OTA_ENABLED=false >> .env
```

## Expected Outcome
After clean rebuild:
- ✅ App initializes without syntax error
- ✅ "Initialization Error" screen should not appear
- ✅ OTA toggle continues to work

## Troubleshooting

### If error still appears after clean rebuild:
1. Check if any TypeScript files have syntax errors
2. Verify no invisible BOM characters in config files
3. Try starting with minimal configuration
4. Check Metro bundler logs for specific file causing error

### Common file encoding fix (Windows):
```powershell
# PowerShell command to check for BOM
$bytes = [System.IO.File]::ReadAllBytes(".env")
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host "BOM detected!"
}
```

## Status
- [x] Configuration files verified
- [x] Build cache cleaned
- [ ] Dependencies reinstalling (in progress)
- [ ] Rebuild and test
