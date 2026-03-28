#!/usr/bin/env bash
# Dev script with health guard auto-fix (clears caches, converts encodings)
node scripts/rork-health-guard.mjs --fix --assume-dev-client --skip-tsc "$@" && dotenv -e .env -- expo start -c
