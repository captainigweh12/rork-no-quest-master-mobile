# OTA and Build Error Fix Plan

## Problem Diagnosis

### Issues Identified:

1. **OTA Update Failure** (Primary Issue)
   - GitHub Actions workflow publishes OTA updates without setting `OTA_ENABLED=true`
   - `app.config.ts` defaults to `OTA_ENABLED=false` when env var is not set
   - This creates a misconfigured OTA update that fails

2. **Bundling Error** (Secondary Issue - Caused by OTA)
   - App shows "Bundling failed without error"
   - This occurs when the app tries to fetch a malformed/disabled OTA update
   - The update exists in EAS but has `enabled: false` in its configuration

3. **Workflow Configuration**
   - Build jobs are conditional and were skipped (not failed)
   - OTA update job runs on every push without proper environment setup

## Root Cause

The OTA error **IS** causing the build error. Here's the chain:

```
GitHub Actions Push
  ↓
OTA Update Job Runs (without OTA_ENABLED=true)
  ↓
EAS publishes update with { enabled: false }
  ↓
App tries to load the update
  ↓
Bundling fails because update is disabled
  ↓
"Bundling failed without error" message
```

## Solution Plan

### Fix 1: Update GitHub Actions Workflow
Add environment variable to enable OTA updates during CI/CD:

```yaml
- name: Publish update
  env:
    OTA_ENABLED: 'true'
  run: eas update --branch main --message "${{ github.event.head_commit.message }}" --non-interactive
```

### Fix 2: Add OTA Update Channel Configuration
Ensure the update targets the correct channel in `eas.json`:

```json
"update": {
  "main": {
    "channel": "main"
  }
}
```

### Fix 3: Fix App Configuration
Update `app.config.ts` to handle OTA more gracefully:

```typescript
// For CI/CD, enable OTA by default if not explicitly disabled
const OTA_ENABLED = process.env.OTA_ENABLED !== 'false';
```

### Fix 4: Add Fallback Handling
Update the app to handle OTA failures gracefully without breaking the bundle.

## Implementation Steps

1. ✅ Update `.github/workflows/eas-build.yml` to set `OTA_ENABLED=true`
2. ✅ Verify `eas.json` update configuration
3. ✅ Update `app.config.ts` OTA logic
4. ✅ Test the fix locally
5. ✅ Push changes and verify GitHub Actions workflow

## Testing Plan

1. **Local Test**: Run `OTA_ENABLED=true npx expo start` to verify config
2. **CI Test**: Push a commit and verify OTA update succeeds
3. **App Test**: Verify app loads without bundling errors

## Expected Outcome

- ✅ OTA updates publish successfully in GitHub Actions
- ✅ App loads without "Bundling failed without error"
- ✅ Updates are properly configured and functional
- ✅ Build jobs can run when triggered with `[build]` or `[preview]` in commit message

## Rollback Plan

If issues persist:
1. Disable OTA updates entirely: Set `OTA_ENABLED=false` in workflow
2. Remove the update job from workflow temporarily
3. Build and deploy a new custom dev client with OTA disabled
