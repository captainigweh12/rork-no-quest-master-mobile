# EAS GitHub Actions Setup Guide

## Issue
GitHub Action "Publish OTA Update" is failing in ~8 seconds. This indicates EAS authentication or project linking issues.

## Solution: 5-Minute Setup Checklist

### 1. Create Expo Access Token

1. Go to [expo.dev](https://expo.dev)
2. Click your avatar → **Account settings**
3. Navigate to **Access Tokens**
4. Click **Create token**
5. Copy the generated token

### 2. Add Token to GitHub Secrets

1. Go to your repo on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `EXPO_TOKEN`
5. Value: Paste your Expo access token
6. Click **Add secret**

### 3. Link App to EAS Project

Run these commands locally in your repo:

```bash
# Verify you're logged in to Expo
bun x eas whoami

# If not logged in:
bun x eas login

# Initialize EAS project (links your app)
bun x eas init
```

Follow the prompts and either select an existing project or create a new one.

### 4. Verify EAS Configuration

After running `eas init`, verify that your `app.json` or `app.config.ts` contains:

```json
{
  "expo": {
    "runtimeVersion": { "policy": "sdkVersion" },
    "updates": { 
      "url": "https://u.expo.dev/<your-project-id>" 
    },
    "extra": { 
      "eas": { 
        "projectId": "<your-project-id>" 
      } 
    }
  }
}
```

Commit and push these changes to GitHub.

### 5. Update GitHub Workflow

Create or update `.github/workflows/eas-build.yml`:

```yaml
name: EAS Build & Update
on:
  push:
    branches: [ main ]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile

      - name: Setup Expo/EAS (CI login)
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      # Optional sanity check
      - run: npx expo-doctor

      # Publish to production channel
      - run: npx eas update --channel production --non-interactive --message "ci $GITHUB_SHA"
```

**Important:** If your app listens to a different channel (e.g., `default`, `preview`, `staging`), change `--channel` accordingly.

### 6. Ensure You Have a Runtime Build

EAS Update only reaches users who installed a build pointing at that channel.

If you haven't built with the production channel yet:

```bash
# Build for iOS
bun x eas build --platform ios --profile production --non-interactive

# Build for Android
bun x eas build --platform android --profile production --non-interactive
```

Ensure your `eas.json` `production` profile sets `"channel": "production"`:

```json
{
  "build": {
    "production": {
      "channel": "production",
      "distribution": "store"
    }
  }
}
```

## Common Fast-Fail Reasons (8-Second Failures)

1. **Missing `EXPO_TOKEN` in GitHub Secrets**
   - Error: "not logged in"
   - Fix: Add token as described in Step 2

2. **Project Not Linked**
   - Missing `updates.url` or `projectId` in config
   - Fix: Run `eas init` as described in Step 3

3. **Wrong Channel**
   - Publishing to `production` but app targets `default`
   - Publish succeeds but users see no update
   - Fix: Match channels in workflow and `eas.json`

4. **CI Using npm/npx in Bun Environment**
   - Fix: Use `expo/expo-github-action@v8` + `bun install`

## Verification Steps

1. Commit all changes to git
2. Push to GitHub: `git push origin main`
3. Watch the GitHub Actions run
4. If it still fails, check the **"Publish OTA Update"** job logs

## Troubleshooting

If the workflow still fails after following these steps:

1. Open the failed GitHub Actions run
2. Click on the **"Publish OTA Update"** step
3. Copy the first ~20 error lines
4. Share them for further diagnosis

## Next Steps After Success

Once OTA updates are working:

1. Updates will be published on every push to `main`
2. Users with the production build will receive updates automatically
3. Monitor update adoption in your Expo dashboard

---

**Note:** The bundling audit issues have been separately resolved. This guide addresses the EAS GitHub Actions integration.
