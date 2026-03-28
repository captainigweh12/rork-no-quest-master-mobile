# Daily live streaming: platform bridge, guards, and feature flag

This app uses a platform bridge for Daily to ensure web and native builds resolve the right SDK:
- Web: `@daily-co/daily-js` via `contexts/dailyClient.web.ts`
- Native: `@daily-co/react-native-daily-js` via `contexts/dailyClient.native.ts`

The shared context `contexts/DailyContext.tsx` imports from `@/contexts/dailyClient` and adds runtime guards.

## Feature flag

Set `EXPO_PUBLIC_DAILY_ENABLED` to control availability (default: true):
- `EXPO_PUBLIC_DAILY_ENABLED=false` disables Daily at runtime (UI calls will show a friendly alert).
- On native, if the Daily native SDK is not present (e.g., Expo Go), the context will mark Daily unsupported and guard calls.

## Capabilities and guards

`DailyContext` exposes:
- `isSupported: boolean` and `supportReason?: string` for runtime checks
- `capabilities: { canJoin, canPublish, canScreenShare }`
- All actions (create/join/leave/toggles) guard on `isSupported` and show an alert when unavailable

## Notes for native testing

Expo Go cannot load `@daily-co/react-native-daily-js`. Use a dev build:

```powershell
bun add @daily-co/react-native-daily-js @daily-co/react-native-webrtc
npx expo prebuild
npx expo run:android   # or: npx expo run:ios
```

Keep the bridge files — web continues to use the web SDK, native resolves the RN module.

## Troubleshooting
- Web build failing to resolve native module: ensure you didn’t import `@daily-co/react-native-daily-js` directly; import from `@/contexts/dailyClient` only.
- Native runtime error in Expo Go: expected; use a dev build or set `EXPO_PUBLIC_DAILY_ENABLED=false` to hide Daily UI paths.
