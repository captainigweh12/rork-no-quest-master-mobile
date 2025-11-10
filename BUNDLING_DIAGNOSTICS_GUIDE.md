# Bundling Diagnostics Guide

## Quick Start

When you encounter a bundling error, run:

```bash
bun run diagnose
```

This script will automatically detect and report common bundling issues.

## What It Checks

### 1. **Common Bundling Error Patterns**
   - Wrong import paths (e.g., `@rork/toolkit-sdk` instead of `@rork-ai/toolkit-sdk`)
   - Wrong require statements
   - Shows exact line numbers and suggested fixes

### 2. **Rork SDK Imports**
   - Scans all source files for incorrect package names
   - Reports every instance with file path and line number

### 3. **Babel Configuration**
   - Verifies module resolver aliases are configured
   - Checks for both `@` and `@rork-ai/toolkit-sdk` aliases
   - Detects incorrect alias names

### 4. **Stub Files**
   - Ensures required stub files exist:
     - `stubs/rork-toolkit-sdk.ts`
     - `stubs/rork-ai-toolkit-dev-sdk.ts`

### 5. **TypeScript Configuration**
   - Verifies path mappings match Babel config
   - Checks for `@/*` path mapping

### 6. **Metro Bundler**
   - Validates metro.config.js exists and is readable
   - Checks for `extraNodeModules` configuration

### 7. **Cache Health**
   - Detects stale cache directories
   - Suggests cleanup commands when needed

## Understanding the Output

### ✓ Green Checks
Indicates everything is configured correctly.

### ⚠ Yellow Warnings
Non-critical issues that might affect bundling.

### ✗ Red Errors
**Critical issues that will cause bundling to fail.**

## Example Output

```
🔬 BUNDLING FAILURE DIAGNOSTICS

============================================================
  CHECKING FOR COMMON BUNDLING ERRORS
============================================================
✗ Wrong Rork SDK import path in app/(tabs)/community.tsx:18
  import { generateObject } from '@rork-ai/toolkit-sdk';
  Fix: Change '@rork-ai/toolkit-sdk' to '@rork-ai/toolkit-sdk'

============================================================
  DIAGNOSTIC REPORT
============================================================

Total Issues: 1 (1 errors, 0 warnings)

❌ ERRORS:
  1. [BUNDLING_ERROR_PATTERN] Wrong Rork SDK import path in app/(tabs)/community.tsx:18
     File: app/(tabs)/community.tsx

💡 QUICK FIXES:
  # Fix wrong imports:
  find app components contexts services lib -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/@rork\/toolkit-sdk/@rork-ai\/toolkit-sdk/g" {} +

  # Clear caches and restart:
  rm -rf .expo .cache node_modules/.cache
  bun x expo start -c

🎯 ROOT CAUSE ANALYSIS:
→ Import path mismatch detected
  The most likely cause is using @rork/toolkit-sdk instead of @rork-ai/toolkit-sdk
```

## Root Cause Analysis

The script provides automatic root cause analysis:

### Import Path Mismatch
**Symptom:** `Unable to resolve "@rork-ai/toolkit-sdk"`

**Cause:** Using wrong package name

**Fix:** Run the suggested sed command to fix all imports at once

### Babel Configuration Issue
**Symptom:** Module not found errors for aliased paths

**Cause:** Missing or incorrect aliases in babel.config.js

**Fix:** Add or correct the aliases in babel.config.js

### Missing Stub Files
**Symptom:** Cannot resolve SDK imports even with correct path

**Cause:** Stub files don't exist

**Fix:** Create the required stub files in the `stubs/` directory

## Quick Fixes

### Fix All Wrong Imports (Linux/macOS)
```bash
find app components contexts services lib -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/@rork\/toolkit-sdk/@rork-ai\/toolkit-sdk/g" {} +
```

### Fix All Wrong Imports (macOS with BSD sed)
```bash
find app components contexts services lib -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s/@rork\/toolkit-sdk/@rork-ai\/toolkit-sdk/g" {} +
```

### Clear All Caches
```bash
rm -rf .expo .cache node_modules/.cache
bun x expo start -c
```

## Workflow

1. **Encounter bundling error** → Run `bun run diagnose`
2. **Review the output** → Look at the ROOT CAUSE ANALYSIS section
3. **Apply quick fixes** → Copy/paste the suggested commands
4. **Re-run diagnostic** → Run `bun run diagnose` again to verify
5. **Start bundling** → Run `bun run start`

## Integration with Other Tools

This diagnostic tool works alongside:

- `bun run audit:bundle` - Comprehensive bundle audit (slower but more thorough)
- `bun run rork:guard` - Runtime health checks
- `bun x expo start -c` - Start with clean cache

## Common Scenarios

### Scenario 1: Fresh Clone
```bash
bun install
bun run diagnose
# Fix any issues
bun run start
```

### Scenario 2: After Pulling Changes
```bash
git pull
rm -rf .expo .cache node_modules/.cache
bun run diagnose
bun run start
```

### Scenario 3: "Bundling failed without error"
```bash
bun run diagnose
# Read the ROOT CAUSE ANALYSIS
# Apply suggested fixes
bun run diagnose  # Verify
bun run start
```

## Exit Codes

- **0**: All checks passed, ready to bundle
- **1**: Found issues that will cause bundling to fail

You can use this in CI/CD:
```bash
bun run diagnose && bun run start
```

## Troubleshooting

### "Could not check imports: glob is not installed"
```bash
bun add -d glob
```

### Script says "All checks passed" but bundling still fails
Run the more comprehensive audit:
```bash
bun run audit:bundle
```

### Need to check a specific file
The script automatically scans common source directories. To manually check:
```bash
grep -r "@rork-ai/toolkit-sdk" app components contexts services lib
```

## Tips

1. **Run before starting dev server** to catch issues early
2. **Add to CI/CD** to prevent bundling issues in production
3. **Clear caches regularly** if you see weird caching issues
4. **Check the exact line numbers** - the script shows where to look

## Support

If the diagnostic tool doesn't catch your issue:
1. Run the comprehensive audit: `bun run audit:bundle`
2. Check the Metro bundler logs directly
3. Try starting with `DEBUG=*` for verbose logging
