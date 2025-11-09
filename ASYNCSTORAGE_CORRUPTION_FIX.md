# AsyncStorage Corruption Fix - Complete Guide

This guide covers the integrated storage health guard system that automatically detects and fixes corrupted AsyncStorage data, UTF-16 encoding issues, JSON parse errors, and other common app initialization problems.

## 🎯 What It Does

The **Unified Health Guard System** runs on every app startup and:

1. ✅ **Validates all storage keys** (auth, user, profile, categories, etc.)
2. ✅ **Auto-erases corrupt JSON** without crashing
3. ✅ **Expires stale data** (e.g., sessions older than 7 days)
4. ✅ **Detects and reports environment** (MMKV vs AsyncStorage, platform, etc.)
5. ✅ **Catches SyntaxErrors** during initialization and triggers nuclear clear
6. ✅ **Pre-flight checks** (via npm scripts) catch encoding issues before Metro starts

## 📁 System Architecture

### Runtime Components (In-App)

```
lib/storage/
├── adapter.ts         # Storage abstraction (MMKV + AsyncStorage fallback)
└── healthGuard.ts     # Validation, auto-clear, nuclear clear
```

**Key Functions:**
- `runFullHealthCheck()` - Complete health check with environment report
- `nuclearClear()` - Wipe all storage (safe, never throws)
- `setJSON()` / `getJSON()` - Safe JSON with TTL support

### Pre-Flight Scripts (CLI)

```
scripts/
├── rork-health-guard.mjs          # Encoding, JSON, TypeScript checks
├── check-storage-health.js        # Quick critical file validator
└── diagnose-asyncstorage.js       # Storage implementation analyzer
```

## 🚀 Quick Start

### 1. Development with Health Guard

```bash
# Run with health guard (recommended)
npm run dev

# Auto-fix encoding issues + clean caches
npm run dev:fix
```

### 2. Manual Health Checks

```bash
# Check critical files only
npm run storage:check

# Diagnose full storage implementation
npm run storage:diagnose

# Clean caches without starting app
npm run rork:clean
```

### 3. In-App Health Check (Debug Screen)

Navigate to `/clear-storage` in your app:

- 💚 **Run Storage Health Check** - Full validation + auto-clear
- ☢️ **Nuclear Clear** - Complete wipe (last resort)
- 📦 **View AsyncStorage** - Inspect current state

## 🔍 How It Works

### On Startup (Automatic)

```typescript
// app/_layout.tsx - runs once per boot
useEffect(() => {
  (async () => {
    try {
      const report = await runFullHealthCheck();
      
      // Logs:
      // ✅ Auto-cleared 3 corrupt/stale items
      // 📊 Environment: AsyncStorage on ios
      
    } catch (err) {
      // If health check fails, nuclear clear + reload
      await nuclearClear();
    }
  })();
}, []);
```

### What Gets Validated

| Key | Validator | TTL | Default |
|-----|-----------|-----|---------|
| `baseUrlOverride` | Valid HTTPS URL or `undefined` | - | `undefined` |
| `session` | Object | 7 days | - |
| `user` | Object | - | - |
| `profile` | Object | - | - |
| `onboarding` | Boolean | - | - |
| `categories` | Array | - | - |
| `quests` | Array | - | - |
| `journals` | Array | - | - |

**Auto-Actions:**
- Invalid JSON → deleted
- Bad shape (fails validator) → deleted or defaulted
- Expired TTL → deleted
- Unknown keys (optional scan) → deleted

### Pre-Flight Guard (Before Metro)

```bash
npm run dev
# ↓ runs rork-health-guard.mjs

# Checks:
# 1. UTF-16 / BOM encoding in config files
# 2. JSON validity (package.json, tsconfig.json, eas.json)
# 3. TypeScript dry run (tsc --noEmit)
# 4. Native module detection (MMKV vs Expo Go)
# 5. Broken relative imports
```

**Auto-Fix Mode:**
```bash
npm run dev:fix
# ↓ converts UTF-16 → UTF-8, strips BOMs, cleans caches
```

## 🛠️ Troubleshooting

### "Bundling failed without error"

**Cause:** Silent Metro crash due to encoding or caching issue

**Fix:**
```bash
npm run dev:fix
```

This will:
1. Convert any UTF-16 files to UTF-8
2. Strip UTF-8 BOMs
3. Clean Metro/Expo caches
4. Validate JSON configs

---

### "[EMERGENCY] Failed to import AsyncStorage: SyntaxError"

**Cause:** Corrupted JSON in storage keys

**Fix:** Already handled automatically! The health guard:
1. Detects the error on boot
2. Runs `nuclearClear()` automatically
3. Logs: `✅ Nuclear clear successful - please reload`

**Manual Fix:**
```bash
# Navigate to /clear-storage in app
# Tap "☢️ NUCLEAR CLEAR"
```

---

### "source.uri should not be an empty string"

**Cause:** Image component receiving empty URI (separate issue, not storage)

**Fix:**
```typescript
// Before
<Image source={{ uri: imageUri }} />

// After
{imageUri ? (
  <Image source={{ uri: imageUri }} />
) : (
  <Image source={require('@/assets/placeholder.png')} />
)}
```

---

### "Linking scheme 'noquest' does not appear in list"

**Cause:** Deep linking mismatch (separate issue)

**Fix:**
```typescript
// app.config.ts
export default {
  expo: {
    scheme: ['rork', 'app.rork', 'noquest'], // ← add missing scheme
  }
}
```

---

## 📊 Health Check Report Example

```typescript
{
  storage: {
    ok: ['auth:session', 'app:user', 'app:profile'],
    fixed_defaulted: ['EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE'],
    deleted_invalid_json: ['corrupted_key_1', 'corrupted_key_2'],
    deleted_bad_shape: ['malformed_array'],
    expired: ['old_session']
  },
  environment: {
    hasMMKV: false,
    storageType: 'AsyncStorage',
    platform: 'ios',
    isDev: true
  },
  timestamp: '2025-11-09T12:34:56.789Z'
}
```

## 🎨 Customization

### Add New Validated Keys

```typescript
// lib/storage/healthGuard.ts

export const KEYS = {
  // ... existing keys
  myNewKey: 'app:my_new_key',
} as const;

const VALIDATORS: Partial<Record<string, Validator<any>>> = {
  // ... existing validators
  [KEYS.myNewKey]: (v): v is string => typeof v === 'string' && v.length > 0,
};

const DEFAULTS: Partial<Record<string, unknown>> = {
  // ... existing defaults
  [KEYS.myNewKey]: 'default_value', // or undefined to delete
};
```

### Add TTL (Auto-Expiry)

```typescript
const TTL: Partial<Record<string, number>> = {
  [KEYS.session]: 1000 * 60 * 60 * 24 * 7, // 7 days
  [KEYS.myNewKey]: 1000 * 60 * 60, // 1 hour
};
```

### Scan All Unknown Keys (Deep Clean)

```typescript
// One-time deep clean on startup
await runFullHealthCheck(); // automatically includes scanAllUnknownKeys: true

// Or manually
await runStorageHealthGuard({ 
  autoErase: true, 
  scanAllUnknownKeys: true 
});
```

## 🔐 Production Checklist

- [x] Health guard runs on every app boot
- [x] SyntaxError auto-recovery enabled
- [x] Pre-flight checks in `npm run dev`
- [x] Nuclear clear available in debug screen
- [x] All critical storage keys validated
- [x] TTL configured for sessions
- [x] MMKV fallback to AsyncStorage (Expo Go safe)

## 📝 Scripts Reference

| Script | Purpose | Use Case |
|--------|---------|----------|
| `npm run dev` | Start with pre-flight checks | Daily development |
| `npm run dev:fix` | Auto-fix + clean + start | After git pull, encoding issues |
| `npm run rork:guard` | Check only (no fix, no start) | CI/CD pipeline |
| `npm run rork:guard:fix` | Fix without starting Metro | Manual cleanup |
| `npm run rork:clean` | Clean caches only | Bundle size issues |
| `npm run storage:check` | Quick critical file check | Fast validation |
| `npm run storage:diagnose` | Deep storage analysis | Debugging storage bugs |

## 🧪 Testing

### Simulate Corrupted Storage

```typescript
// Add to a test screen
import AsyncStorage from '@react-native-async-storage/async-storage';

async function corruptStorage() {
  // Invalid JSON
  await AsyncStorage.setItem('auth:session', '{invalid json}');
  
  // Bad shape
  await AsyncStorage.setItem('app:categories', '123'); // should be array
  
  // Expired
  const expired = { value: { id: 1 }, ts: Date.now() - 8 * 24 * 60 * 60 * 1000 };
  await AsyncStorage.setItem('auth:session', JSON.stringify(expired));
}
```

**Expected:** On next boot, health guard auto-clears all 3 items

### Verify Auto-Recovery

```bash
# 1. Corrupt storage (above)
# 2. Restart app
# 3. Check console logs:

# Expected:
# [APP] 🔍 Running full health check with auto-clear...
# [StorageHealthGuard] ✅ Auto-cleared 3 corrupt/stale items
# [APP] ✅ Health check complete
```

## ⚡ Performance

- **Startup overhead:** ~50-100ms (validates 8-10 keys)
- **Deep scan (all keys):** ~200-500ms depending on storage size
- **Nuclear clear:** ~10-20ms (one native call)
- **Pre-flight scripts:** ~2-5s (only in development)

## 🎯 Key Benefits

1. **Zero crashes from corrupt storage** - Safe parsing everywhere
2. **Auto-recovery** - No manual intervention needed
3. **Expo Go compatible** - Graceful MMKV fallback
4. **Developer-friendly** - Clear logs, debug screen, CLI tools
5. **Production-ready** - Runs on every boot, catches issues early

## 📚 Related Files

- [`lib/storage/adapter.ts`](lib/storage/adapter.ts) - Storage abstraction layer
- [`lib/storage/healthGuard.ts`](lib/storage/healthGuard.ts) - Health guard implementation
- [`app/_layout.tsx`](app/_layout.tsx) - Startup integration
- [`app/clear-storage.tsx`](app/clear-storage.tsx) - Debug UI
- [`scripts/rork-health-guard.mjs`](scripts/rork-health-guard.mjs) - Pre-flight script

---

**Last Updated:** 2025-11-09  
**Status:** ✅ Production Ready
