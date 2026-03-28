## Quick orientation for AI coding agents

This repo is a mobile app built with Expo + React Native + Expo Router, written in TypeScript and developed with Bun.

Keep edits small, concrete, and runnable. Prefer modifying actual files under `app/`, `lib/`, or `contexts/` rather than proposing high-level changes without code.

Key facts at a glance
- Frameworks: Expo (managed), Expo Router (file-based routing), React Query (@tanstack/react-query), tRPC, Supabase, and several provider contexts under `@/contexts`.
- Package manager & runtime: Bun is used in CI/dev commands. Expect `bun i`, `bun run start`, etc.
- Entrypoints:
  - `app/` — routing and UI. Add screens by creating files in `app/` (example: `app/(tabs)/profile.tsx`).
  - `app/_layout.tsx` — global providers (see `QueryClientProvider`, `trpc.Provider`, many `@/contexts` and the BaseUrl bootstrap behavior).
  - `lib/` — helpers and clients (e.g., `lib/trpc`, `lib/baseUrl`).

Important repo patterns (concrete, discoverable)
- File-based routing: use `app/(group)/page.tsx` conventions used by Expo Router. Example: add a new tab under `app/(tabs)/` and export a default React component.
- Global providers & bootstrap: `app/_layout.tsx` wires tRPC, React Query, and many contexts (Auth, Onboarding, Schema, VideoSDK, YouTube, Stream). When changing network config or client creation, update `createTrpcClient()` in `lib/trpc` and the base URL helpers in `lib/baseUrl`.
- Base URL override: the app proactively sets a base URL override at startup (see `BaseUrlBootstrap` in `app/_layout.tsx`). If you need to change backend endpoints, update `lib/baseUrl` and ensure bootstrap timing is respected.
- Environment handling: local scripts run with `dotenv -e .env --` so rely on `.env` for secrets during dev. For native surfaced values rely on `app.json` → `extra` (access via Expo Constants when appropriate).
- Path alias: `@/*` maps to `./*` in `tsconfig.json`. Prefer `@/contexts/...`, `@/lib/...`, etc.
- No plaintext secrets: don't commit secrets; use `.env` or `app.json` `extra` for values that need to be present in builds.

Dev & common commands (use PowerShell on Windows)
- Install deps: `bun i`
- Start (mobile): `bun run start` (scripts load `.env` via `dotenv-cli`). Then press `i` or run with `--ios`/`--android`.
- Start web preview: `bun run start-web`
- Rork preview: `bun run start-rork` / `bun run start-rork-tunnel` (project id is embedded in scripts; don't remove unless intentional).
- Clean cache: `bunx expo start --clear`
- Lint: `bun run lint`

Integration points to watch
- tRPC client/server contract: `lib/trpc` creates a tRPC client and is provided via `trpc.Provider` in `app/_layout.tsx`. Changing server routes/types requires coordination with backend code.
- Supabase: look for `SUPABASE_URL` / `SUPABASE_ANON_KEY` in `app.json` and any `supabase` helpers. Schema changes may require migrations; SQL files live at repo root (many migration scripts exist).
- Video/streaming: there is a `VideoSDKContext` and `StreamContext` — changes to streaming flows often require native/EAS dev builds for testing.

Developer gotchas
- Native-only features (Push, FaceID, IAP, advanced camera/mic) require an EAS dev build — they won't run in Expo Go.
- The repo intentionally sets a base URL override on startup to point at a Render deployment if none present; be careful when changing `getBaseUrl()` or storage keys.
- Many SQL migration files exist in repo root; modifying DB shape should reference these and `supabase-schema.sql`.

When editing or adding code
- Small, testable changes: update a screen in `app/`, then run `bun run start` and verify on simulator/web. If you add provider-level logic, ensure `app/_layout.tsx` ordering remains correct (providers wrap in a specific order).
- Tests & validation: there are scripts and small test files (e.g., `test-env-setup.tsx`, `test-edge-function.sh`). Run or adapt them as needed.

If you need more context
- Open `app/_layout.tsx` (global providers & BaseUrlBootstrap), `lib/trpc.ts` (tRPC client creation), and `lib/baseUrl.ts` (base URL override helpers). These three files explain most cross-cutting behavior.

If anything here is incomplete or you want more examples (routing, a sample tRPC mutation, or a walkthrough for adding a new provider), tell me which area to expand and I will update this file.
