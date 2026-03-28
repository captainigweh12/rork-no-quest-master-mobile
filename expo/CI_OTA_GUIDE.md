# CI & OTA Update Guide

> Status: OTA and EAS Build are disabled for now. The GitHub Actions workflow exists but all jobs are no-op. Use local dev with Expo CLI; re-enable steps are documented below.

This document explains how EAS Build + OTA Updates are configured for this project, how to trigger each workflow, and how to safely enable/disable updates.

## Overview

- Build profiles in `eas.json` remain defined for future use, but CI build jobs are currently disabled.
- GitHub Actions workflow `.github/workflows/eas-build.yml` is present, manual-only, and all jobs are explicitly disabled (no builds will run).
- OTA is hard-disabled at runtime; no update job exists in CI.
- OTA enablement (for later) is controlled by:
  - `OTA_ENABLED` (true/false) at build time to embed capability.
  - `ALWAYS_DISABLE_OTA` (true) to hard override and disable checks at runtime.

## Triggers

| Action | Trigger Condition | Result |
|--------|-------------------|--------|
| Dev Client build | (disabled) | No-op |
| Preview build | (disabled) | No-op |
| Production build | (disabled) | No-op |
| OTA Update publish | (removed) | Not applicable |

Notes:
- The workflow is manual-only and all jobs are explicitly disabled. Re-enable by editing `.github/workflows/eas-build.yml` and restoring job `if` conditions and triggers.

## Updating the App Version

Runtime version policy is `appVersion`. To create a new runtime (breaking old OTA compatibility):
1. Bump `version` in `app.config.ts` / `app.json` (keep them coherent if both used).
2. Commit with `[release]` (or create a tag `v1.0.1`).
3. Build the new binaries.
4. Future OTA updates must target the new runtime (will automatically use the bumped version).

If you only changed JS and want OTA to deliver it, do NOT bump `version`; just push to `main` and let the update job publish.

## Common CI / OTA Error Causes & Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| App logs `OTA updates disabled in config` | `OTA_ENABLED=false` or `ALWAYS_DISABLE_OTA=true` | Ensure build profile env sets `OTA_ENABLED=true` and remove hard-off flag |
| GitHub Action error: `Context access might be invalid: EXPO_TOKEN` | Missing `EXPO_TOKEN` secret in repository settings | Create Expo access token and add as Actions secret named `EXPO_TOKEN` |
| GitHub Action builds succeed but no updates published | Update job removed or `[skip-update]` in commit | Restore update job and remove skip token |
| Update publishes but devices don’t receive | Different channel or runtime mismatch | Confirm channel used matches device build profile; ensure version not bumped unintentionally |
| `Updates.checkForUpdateAsync` throws | Missing network / token / outdated client | Ensure device is on production build, not dev client; verify network connectivity |
| Changes not visible after publish | Binary built with `OTA_ENABLED=false` | Rebuild a production binary with OTA enabled |

## Hard Disabling OTA

OTA is currently hard-disabled in runtime code. For a future re-enable:
1. Remove `ALWAYS_DISABLE_OTA` from build env/profile.
2. Ensure `OTA_ENABLED=true` in the intended build profile.
3. Rebuild store binaries so the update capability is embedded (if previously off).
4. Restore an OTA publish job in CI (or publish manually).

### EXPO_TOKEN Setup Steps

Note: Not required while EAS Build is disabled. Only set this up when you re-enable CI builds.

1. Generate token:
  - Web: Expo dashboard → Account Settings → Access Tokens → Create.
  - CLI: `npx expo login` then `npx expo token:generate`.
2. Copy token immediately (cannot be viewed again).
3. In GitHub repo: Settings → Secrets and variables → Actions → New repository secret.
4. Name: `EXPO_TOKEN`, Value: (paste token).
5. Re-run workflow; error disappears.

Rotate tokens periodically (e.g. every 90 days) and revoke on compromise.

## Manual OTA Publish Command (When Enabled)

To publish manually from local machine (using Expo CLI):

```powershell
$env:OTA_ENABLED="true"
eas update --channel production --message "Manual update"
```

## Rollback Strategy

1. Identify last working update ID (from Expo dashboard or CLI).
2. Re-publish the prior commit: `eas update --channel production --message "Rollback to <commit-sha>" --non-interactive`.
3. Optionally set `ALWAYS_DISABLE_OTA=true` for a temporary freeze while investigating.

## Checklist Before Publishing OTA

- [ ] Confirm no breaking native module changes (else build new binaries).
- [ ] Ensure `version` unchanged if you want same runtime.
- [ ] Verify `OTA_ENABLED=true` in production profile (`eas.json`).
- [ ] Commit message does not include `[skip-update]`.
- [ ] Secrets: `EXPO_TOKEN` present in repo settings.

## Environment Flags Summary

| Flag | Location | Effect |
|------|----------|--------|
| OTA_ENABLED | eas.json build profile env / workflow step | Embeds update capability in binary |
| ALWAYS_DISABLE_OTA | eas.json env / build step | Hard disables checking at runtime |
| EXPO_TOKEN | GitHub Actions secret | Authenticates EAS CLI in CI |

## Channels

- `development`: For dev client builds (no OTA).
- `preview`: For internal QA; OTA allowed.
- `production`: For store builds and published updates.

Ensure devices you expect to receive OTA are built with matching channel profile (production binaries talk to production channel). Mismatched channels silently ignore updates.

## Troubleshooting Script Idea

You can add a simple screen (already present: `app/update-debug.tsx`) using `getCurrentUpdateInfo()` from `lib/updateManager.ts` to verify `otaEnabled`, `alwaysDisableOta`, and channel/runtime at runtime.

---
Last updated: 2025-11-10
