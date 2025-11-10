# Automated Bundling Fix

This script automatically fixes common bundling issues in the project.

## Usage

```bash
# Run the automated fix
node scripts/auto-fix-bundling.mjs

# Or add to package.json and run:
bun run fix:bundle
```

## What It Fixes

### 1. Incorrect Rork SDK Imports
- Searches all TypeScript/JavaScript files
- Replaces `@rork/toolkit-sdk` with `@rork-ai/toolkit-sdk`
- Updates imports in: app, components, contexts, services, lib, hooks, providers

### 2. Babel Configuration
- Verifies babel.config.js has correct module resolver aliases
- Checks for:
  - `'@': './'` (project root alias)
  - `'@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk'`
  - `'@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk'`

### 3. Stub Files
- Verifies required stub files exist:
  - `stubs/rork-toolkit-sdk.ts`
  - `stubs/rork-ai-toolkit-dev-sdk.ts`

### 4. Cache Cleanup
- Clears stale caches that may cause bundling issues:
  - `.expo/`
  - `.cache/`
  - `node_modules/.cache/`
  - `.metro-cache/`

### 5. Post-Fix Verification
- Runs diagnostics after fixes to verify success
- Reports any remaining issues

## Adding to package.json

Add this line to your `scripts` section in package.json:

```json
{
  "scripts": {
    "fix:bundle": "node scripts/auto-fix-bundling.mjs"
  }
}
```

Then run:
```bash
bun run fix:bundle
```

## Workflow

1. **Run diagnostics first** to see what's wrong:
   ```bash
   bun run diagnose
   ```

2. **Run the automated fix**:
   ```bash
   node scripts/auto-fix-bundling.mjs
   ```

3. **Start bundling**:
   ```bash
   bun run start
   ```

## Output Example

```
🔧 AUTOMATED BUNDLING FIX
Automatically fixing common bundling issues...

============================================================
  FIXING INCORRECT RORK SDK IMPORTS
============================================================
✓ Fixed imports in app/create-quest.tsx
✓ Fixed imports in app/(tabs)/map.tsx
✓ Fixed imports in app/(tabs)/community.tsx

✓ Fixed 3 file(s)

============================================================
  VERIFYING BABEL CONFIGURATION
============================================================
✓ Babel config has all required aliases

============================================================
  VERIFYING STUB FILES
============================================================
✓ stubs/rork-toolkit-sdk.ts exists
✓ stubs/rork-ai-toolkit-dev-sdk.ts exists

============================================================
  CLEARING STALE CACHES
============================================================
✓ Cleared .expo
✓ Cleared .cache

✓ Cleared 2 cache directories

============================================================
  RUNNING POST-FIX DIAGNOSTICS
============================================================
Running: bun run diagnose

✓ All checks passed!

============================================================
  FINAL RESULT
============================================================
✓ All fixes applied successfully!
✓ Ready to start bundling

💡 Next step:
  bun run start
```

## Manual Steps (if needed)

If the automated fix encounters issues, you may need to:

### 1. Update babel.config.js manually

Ensure your `babel.config.js` has this structure:

```javascript
const makeConfig = function (api) {
  api && api.cache && api.cache(true);

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './',
          '@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk',
          '@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    'expo-router/babel',
  ];

  return {
    presets: ['babel-preset-expo', '@babel/preset-typescript'],
    plugins,
  };
};

module.exports = makeConfig;
module.exports.default = makeConfig;
```

### 2. Add debug logging

Add this at the top of babel.config.js to verify which config is being loaded:

```javascript
console.log('>> Using babel config at:', __filename);
```

### 3. Check stub files

Ensure these files exist and export the correct functions:
- `stubs/rork-toolkit-sdk.ts`
- `stubs/rork-ai-toolkit-dev-sdk.ts`

### 4. Clear caches manually

If automated cache clearing fails:

```bash
rm -rf .expo .cache node_modules/.cache
bun x expo start -c
```

## Troubleshooting

### "Missing aliases" error persists

The diagnostic may be loading a different babel config. Add the debug line and verify:

```javascript
console.log('>> Using babel config at:', __filename);
```

Run `bun run diagnose` and check which file is being loaded.

### Import fixes not applied

Check if files are read-only or have permission issues. You may need to run:

```bash
chmod +w app/**/*.{ts,tsx} components/**/*.{ts,tsx}
```

### Cache directories won't delete

They may be in use by Metro bundler. Stop all running processes:

```bash
# Kill Metro processes
pkill -f metro
# Or on Windows:
taskkill /F /IM node.exe

# Then run the fix again
node scripts/auto-fix-bundling.mjs
```

## Related Scripts

- `bun run diagnose` - Diagnose bundling issues without fixing
- `bun run audit:bundle` - Comprehensive bundling audit
- `bun run rork:guard` - Health check before starting dev server
- `bun run rork:guard:fix` - Health check with automatic fixes

## Exit Codes

- `0` - All fixes applied successfully, ready to bundle
- `1` - Fixes applied but some issues remain, manual steps required
