#!/bin/bash
# Remote build helper for older Bun versions (pre-bunx)
# Usage: ./scripts/remote-build.sh [prebuild|android|ios|web]

set -e

COMMAND=${1:-prebuild}

echo "🔧 Remote Build Helper (Bun 1.2.20 compatible)"
echo "Command: $COMMAND"
echo ""

case $COMMAND in
  prebuild)
    echo "Running prebuild..."
    bun x expo prebuild --clean
    ;;
  
  android)
    echo "Running Android build..."
    bun x expo run:android
    ;;
  
  ios)
    echo "Running iOS build..."
    bun x expo run:ios
    ;;
  
  web)
    echo "Running web..."
    bun run start-web
    ;;
  
  clean)
    echo "Cleaning build artifacts..."
    rm -rf node_modules .expo android/build android/app/build ios/build
    echo "Run 'bun install' to reinstall dependencies"
    ;;
  
  *)
    echo "❌ Unknown command: $COMMAND"
    echo ""
    echo "Available commands:"
    echo "  prebuild  - Generate native projects"
    echo "  android   - Build and run Android"
    echo "  ios       - Build and run iOS"
    echo "  web       - Start web server"
    echo "  clean     - Clean build artifacts"
    exit 1
    ;;
esac
