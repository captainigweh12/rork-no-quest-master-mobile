# AsyncStorage Corruption Fix

## Problem
The app was experiencing a `SyntaxError: 1:4:';' expected` during initialization. This error indicates corrupted data in AsyncStorage that can't be parsed.

## Root Cause
Some data stored in AsyncStorage became corrupted (possibly malformed JSON, UTF-16 encoding issues, or stray characters like semicolons in URLs). When the app tried to read and parse this data during initialization, it threw a SyntaxError before any clearing mechanisms could run.

## Solution Implemented

### 1. Pre-Initialization Nuclear Clear (`app/_layout.tsx`)
Added corruption detection and clearing **BEFORE** any other initialization code runs:

```typescript
// CRITICAL: Immediately CLEAR storage on SyntaxError BEFORE reading anything
if (Platform.OS !== 'web') {
  // Sets a corruption flag
  // Tests storage by reading first few keys
  // If corruption detected -> immediate nuclear clear
  // Clears flag if test passes
}
```

**How it works:**
1. Sets a `__CORRUPTION_FLAG__` before testing storage
2. Tries to read a few keys to detect corruption
3. If any SyntaxError occurs → **immediately clears ALL storage**
4. If successful → removes the flag

### 2. Enhanced Storage Module (`lib/storage.ts`)
Updated `guardedStorage.getItem()` to:
- Detect SyntaxError or "';' expected" errors
- Automatically delete corrupted keys
- Validate JSON before returning
- Fallback between MMKV and AsyncStorage

### 3. Enhanced Base URL Loading (`lib/baseUrl.ts`)
Updated `loadBaseUrlOverride()` to:
- Catch SyntaxError when reading the override key
- Automatically clear the corrupted override
- Return in-memory value or default

### 4. Improved Emergency Clear Screen (`app/emergency-clear.tsx`)
Made the nuclear clear more aggressive:
- Doesn't try to read keys before clearing
- Uses `AsyncStorage.clear()` first (fastest)
- Falls back to individual key removal if needed
- Waits for storage to settle before setting new values

## How to Use

### If App Won't Load (Shows SyntaxError):

**Option 1: Automatic (Preferred)**
1. The pre-init check should automatically detect and clear corruption
2. You'll see `[PRE-INIT] 🚨 Storage corruption detected` in logs
3. The app will clear storage and continue loading
4. **Restart the app** after seeing the clear message

**Option 2: Manual Emergency Clear**
1. If you can access the app (even if it's broken):
   - Navigate to `/emergency-clear` route
   - Tap "EMERGENCY CLEAR NOW"
   - Follow the instructions to restart

2. If you **cannot** access the app at all:
   - **Delete the app completely**
   - **Reinstall it**
   - This clears all app data including corrupted storage

### After Clearing:
1. **Close the app completely** (don't just minimize)
2. **Swipe it away** from recent apps
3. **Reopen the app**
4. Changes only take effect after full restart

## Prevention

To prevent this in the future:

1. **Always validate URLs** before storing:
   ```typescript
   // Good
   const url = 'https://example.com';
   new URL(url); // Throws if invalid
   await storage.setItem('url', url);
   
   // Bad
   await storage.setItem('url', 'https;://example.com'); // Contains semicolon
   ```

2. **Always validate JSON** before storing:
   ```typescript
   // Good
   const data = { name: 'test' };
   await storage.setItem('data', JSON.stringify(data));
   
   // Bad
   await storage.setItem('data', '{name: test}'); // Invalid JSON
   ```

3. **Use typed storage helpers**:
   ```typescript
   // Automatically validates
   await typedStorage.setJSON('key', myObject);
   const obj = await typedStorage.getJSON('key');
   ```

## Logs to Watch For

### Good Signs:
```
[PRE-INIT] ✅ Storage integrity check passed
[APP_INIT] Storage ready ✓
```

### Warning Signs:
```
[PRE-INIT] 🚨 Storage corruption detected
[PRE-INIT] Performing nuclear clear...
[STORAGE] SyntaxError reading key, clearing it
```

### Success After Clear:
```
[PRE-INIT] ✅ Nuclear clear successful
[Emergency Clear] ✅ AsyncStorage.clear() successful
```

## Technical Details

### Why "1:4:';' expected"?
This specific error means the JavaScript parser encountered a semicolon (`;`) where it expected something else. Common causes:
- URL with `https;://` instead of `https://`
- JSON with `;` in a string
- Malformed data that looks like `abc;def`

### Why Emergency Clear Exists
The regular clear mechanisms (`lib/emergencyStorageClear.ts`, `hooks/useAppInit.ts`) rely on being able to import and run code. If storage corruption happens during the very first read, these modules might not even initialize. The pre-init clear in `app/_layout.tsx` runs **before** any other code.

### File Modification Summary
- ✅ `app/_layout.tsx` - Added pre-init corruption detection and nuclear clear
- ✅ `app/emergency-clear.tsx` - Enhanced to be more aggressive
- ✅ `lib/storage.ts` - Enhanced error handling and corruption detection (already had some)
- ✅ `lib/baseUrl.ts` - Enhanced error handling (already had some)

## Testing
To verify the fix works:

1. **Simulate corruption** (dev only):
   ```javascript
   // In console or test file
   import AsyncStorage from '@react-native-async-storage/async-storage';
   await AsyncStorage.setItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE', 'https;://broken.com');
   ```

2. **Reload app** - should detect and clear automatically

3. **Check logs** for:
   ```
   [PRE-INIT] 🚨 Corrupted key: EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE
   [PRE-INIT] ✅ Nuclear clear successful
   ```

## Support
If the app still won't load after these fixes:
1. Check device logs for `[PRE-INIT]` messages
2. Try the manual emergency clear at `/emergency-clear`
3. Last resort: Delete app and reinstall

## Related Files
- `app/_layout.tsx` - Pre-initialization checks
- `app/emergency-clear.tsx` - Manual nuclear clear UI
- `lib/storage.ts` - Storage abstraction with corruption protection
- `lib/baseUrl.ts` - Base URL management with error handling
- `lib/emergencyStorageClear.ts` - Emergency clear module (backup)
- `hooks/useAppInit.ts` - App initialization sequence
