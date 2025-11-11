# Remote Build Commands (Bun 1.2.20)

**Issue:** Older Bun versions don't have `bunx` command
**Solution:** Use `bun x` instead

## Quick Commands for Remote

### Prebuild (Generate Native Projects)
```bash
# On remote
cd ~/rork-app
bun x expo prebuild --clean
```

Or use package.json script:
```bash
bun run prebuild:clean
```

### Run Android
```bash
# On remote (requires Android SDK + emulator/device)
cd ~/rork-app
bun x expo run:android
```

Or:
```bash
bun run android
```

### Run iOS (macOS only)
```bash
# On remote (requires macOS + Xcode)
cd ~/rork-app
bun x expo run:ios
```

Or:
```bash
bun run ios
```

### Web (Already Working)
```bash
# On remote
cd ~/rork-app
bun run start-web
```

## Common Issues & Fixes

### 1. npm errors when running `bun x expo ...`
**Cause:** `bun x` may try to use npm internally on older versions

**Fix:** Use the helper script instead:
```bash
# On remote
chmod +x scripts/remote-build.sh
./scripts/remote-build.sh prebuild
./scripts/remote-build.sh android
```

### 2. Duplicate tsconfig.json keys
**Warning from Bun:**
```
warn: Duplicate key "@rork-ai/toolkit-sdk" in object literal
```

**Fix:** Edit remote's `tsconfig.json` and ensure each key appears only once:
```bash
# On remote - open in editor
nano tsconfig.json
# or
vim tsconfig.json
```

Check that `"@rork-ai/toolkit-sdk"` appears only once in the `"paths"` object.

### 3. Android SDK Missing
If you get "Android SDK not found":

**Option A:** Build on your Windows machine instead
```powershell
# On Windows
npx expo prebuild --clean
npx expo run:android
```

**Option B:** Install Android SDK on remote
```bash
# On remote - install Android cmdline tools
# See: https://developer.android.com/studio#command-tools
```

## File Sync

After making changes on Windows, sync to remote:

```bash
# From Windows (if you have rsync/scp)
# Replace 'remote-host' with actual hostname
rsync -av --exclude node_modules --exclude .expo ./ user@remote-host:~/rork-app/
```

Or use git:
```bash
# On Windows
git add .
git commit -m "Fix: platform bridge and config"
git push

# On remote
cd ~/rork-app
git pull
bun install
```

## Recommended Workflow

1. **Develop on Windows** (faster, better tooling)
   ```powershell
   bun run start-web
   bun run doctor
   ```

2. **Test web on remote** (Linux compatibility check)
   ```bash
   bun run start-web
   ```

3. **Build native on Windows** (easier Android SDK setup)
   ```powershell
   npx expo prebuild --clean
   npx expo run:android
   ```

## Package Scripts Available

All platforms (run with `bun run <script>`):
- `start-web` - Start web development server
- `prebuild` - Generate native projects
- `prebuild:clean` - Clean prebuild
- `android` - Build and run Android
- `ios` - Build and run iOS (macOS only)
- `doctor` - Auto-fix + diagnose + start
- `diagnose` - Check for bundling issues

## Notes

- Bun 1.2.20 uses `bun x` instead of `bunx`
- npm errors are expected when using `bun x expo` (internal npm usage)
- Use the helper script (`scripts/remote-build.sh`) if `bun x` gives npm errors
- Android/iOS builds require native SDKs installed
- Web builds work everywhere
