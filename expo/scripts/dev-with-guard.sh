#!/usr/bin/env bash
# Quick dev script with health guard bypass
node scripts/rork-health-guard.mjs --assume-dev-client --skip-tsc "$@" && dotenv -e .env -- expo start -c
