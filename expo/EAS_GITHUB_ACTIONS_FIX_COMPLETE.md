# EAS GitHub Actions Fix - Complete

## Summary
Fixed the EAS GitHub Actions workflow that was failing in ~8 seconds due to missing authentication and incorrect configuration.

## Changes Made

### ✅ 1. Updated `eas.json`
Added the `update` section with channel configuration:
```json
"update": {
  "main": {
    "channel": "main"
  },
  "production": {
    "channel": "production"
  },
  "preview": {
    "channel": "preview"
  },
  "development": {
    "channel": "development"
  }
}
```

### ✅ 2. Updated `app.config.ts`
- Moved `projectId` to root level (required by EAS)
- Added type cast to bypass outdated TypeScript types
- ProjectId: `c23bcbuqrsjmkdoaxiu6y`
- Updates URL: `https://u.expo.dev/c23bcbuqrsjmkdoaxiu6y`

### ✅ 3. GitHub Workflow Already Configured
The `.github/workflows/eas-build.yml` already has:
- Correct `expo/expo-github-action@v8` setup
- Proper EXPO_TOKEN usage
- Three jobs: build (development), preview, and update (OTA)

## ⚠️ Manual Steps Required

### Step 1: Create Expo Access Token
1. Go to https://expo.dev/accounts/[your-account]/settings/access-tokens
2. Click "Create Token"
3. Name it something like "GitHub Actions"
4. Copy the token immediately (you won't see it again)

### Step 2: Add Token to GitHub Secrets
1. Go to your GitHub repo: https://github.com/captainigweh12/rork-no-quest-master-mobile/settings/secrets/actions
2. Click "New repository secret"
3. Name: `EXPO_TOKEN`
4. Value: [paste the token from Step 1]
5. Click "Add secret"

### Step 3: Verify EAS Project Locally (Optional)
Run this command to confirm the app is linked:
```bash
bun x eas whoami
```

If you see your Expo username, you're good. If not, run:
```bash
bun x eas init
```
(This should recognize the existing `projectId` in `app.config.ts`)

## How It Works Now

### Auto OTA Updates (on push to main/master)
When you push code to main/master without `[build]` or `[preview]` in the commit message:
- GitHub Actions triggers the "Publish OTA Update" job
- It publishes to the `main` channel
- Users with development/preview builds on the `main` channel will receive the update

### Manual Builds (on demand)
To trigger builds, include in your commit message:
- `[build]` - Builds development clients (iOS + Android)
- `[preview]` - Builds preview versions (iOS + Android)

Or trigger manually via GitHub Actions UI.

## Testing

After completing the manual steps, test with:
```bash
git commit --allow-empty -m "test: verify EAS OTA update [skip ci]"
git push
```

Then check GitHub Actions to see if the workflow succeeds.

## Important Notes

1. **OTA Updates Disabled by Default**: Set `OTA_ENABLED=true` in your environment to enable OTA updates in production
2. **Runtime Builds Required**: Users need runtime builds (development/preview/production) to receive OTA updates
3. **Channel Matching**: OTA updates only apply to builds from matching channels
4. **Error Recovery Only**: Current config checks for updates only after crashes (`checkOnLaunch: 'ERROR_RECOVERY'`)

## Next Steps

1. Complete the manual steps above
2. Test with an empty commit
3. Monitor GitHub Actions for success
4. Once working, consider building runtime apps with:
   ```bash
   bun x eas build --platform ios --profile development
   bun x eas build --platform android --profile development
   ```

## Troubleshooting

If the workflow still fails:
- Verify EXPO_TOKEN is correctly set in GitHub Secrets
- Check that your Expo account owns the project `c23bcbuqrsjmkdoaxiu6y`
- Ensure you're logged in locally with `bun x eas login`
- Check GitHub Actions logs for specific error messages
