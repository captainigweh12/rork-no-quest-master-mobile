# Quick Fix Instructions

## 🚨 Common Issues & Fast Fixes

### 1. "Bundling failed without error"

**Symptoms:** Metro crashes silently, no stack trace

**Fix:**
```bash
npm run dev:fix
```

This auto-fixes encoding issues, strips BOMs, and cleans caches.

---

### 2. "[EMERGENCY] Failed to import AsyncStorage"

**Symptoms:** App crashes on startup with SyntaxError

**Fix:** Already auto-fixed! The app will:
1. Detect the error
2. Run nuclear clear automatically
3. Log success message

If it persists:
```bash
# In app, navigate to /clear-storage
# Tap "☢️ NUCLEAR CLEAR"
```

---

### 3. "source.uri should not be an empty string"

**Symptoms:** Console warning about images

**Fix:**
```typescript
// Add safety check to all images
{imageUri ? (
  <Image source={{ uri: imageUri }} />
) : (
  <Image source={require('@/assets/placeholder.png')} />
)}
```

---

### 4. "Linking scheme mismatch"

**Symptoms:** Deep link errors with 'noquest://'

**Fix:**
```typescript
// app.config.ts
export default {
  expo: {
    scheme: ['rork', 'app.rork', 'noquest'],
  }
}
```

Then:
```bash
npx expo start -c
```

---

## 🛠️ Development Workflow

### Start Development

```bash
# Normal start (with health checks)
npm run dev

# Start + auto-fix any issues
npm run dev:fix

# Just Expo (no checks)
npm start
```

### After Git Pull

```bash
npm run dev:fix
```

This ensures no encoding or cache issues from other contributors.

### Clean Everything

```bash
npm run rork:clean
rm -rf node_modules
npm install
npm run dev
```

---

## 📱 In-App Debug Tools

Navigate to `/clear-storage` for:

- **Test Connection** - Verify API is reachable
- **Health Check** - Validate storage + environment
- **View Storage** - Inspect AsyncStorage keys
- **Nuclear Clear** - Complete wipe (last resort)

---

## 🔍 Checking Storage Health

### Quick Check
```bash
npm run storage:check
```

### Full Diagnosis
```bash
npm run storage:diagnose
```

### In-App Check
1. Open app
2. Go to Settings → API Debug (or `/clear-storage`)
3. Tap "💚 Run Storage Health Check"

---

## ⚡ Emergency Recovery

### App Won't Boot

1. Navigate to `/emergency-clear` or `/clear-storage`
2. Tap "☢️ NUCLEAR CLEAR"
3. Force-quit the app
4. Restart

### Bundle Won't Build

```bash
npm run rork:clean
npx expo start -c --clear
```

### TypeScript Errors After Pull

```bash
npm run rork:guard
# or
npx tsc --noEmit
```

---

## 📊 Scripts Quick Reference

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `npm run dev` | Start with checks | Daily work |
| `npm run dev:fix` | Auto-fix + start | After pull/encoding issues |
| `npm run rork:clean` | Clear caches | Bundle issues |
| `npm run storage:check` | Validate files | Quick health check |
| `npm start` | Just Expo | Skip all checks |

---

## 🎯 Best Practices

1. **Always use `npm run dev`** - Catches issues early
2. **Run `npm run dev:fix` after pull** - Prevents encoding bugs
3. **Keep storage keys minimal** - Less to validate
4. **Use health guard for new keys** - Auto-validation
5. **Test with corrupt data** - Verify auto-recovery

---

## 📞 Support

If issues persist:
1. Check console logs for detailed errors
2. Run full diagnosis: `npm run storage:diagnose`
3. Check [ASYNCSTORAGE_CORRUPTION_FIX.md](ASYNCSTORAGE_CORRUPTION_FIX.md) for details
4. Use in-app debug screen at `/clear-storage`

---

**Last Updated:** 2025-11-09
