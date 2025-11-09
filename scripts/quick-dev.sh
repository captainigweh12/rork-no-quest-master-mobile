#!/bin/bash
# Helper scripts for running common commands with Bun

case "$1" in
  typecheck)
    bun x tsc --noEmit
    ;;
  dev)
    bun run rork:guard -- --assume-dev-client --skip-tsc && bun x expo start -c
    ;;
  dev:android)
    bun x expo run:android
    ;;
  dev:ios)
    bun x expo run:ios
    ;;
  deps:fix)
    bun x expo install --fix && bun x expo-doctor --fix-dependencies
    ;;
  *)
    echo "Usage: ./scripts/dev-with-guard.sh {typecheck|dev|dev:android|dev:ios|deps:fix}"
    exit 1
    ;;
esac
