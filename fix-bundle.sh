#!/bin/bash

echo "🔧 Fixing bundle issues..."

# 1. Clear all caches
echo "📦 Clearing caches..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true

# 2. Clear watchman if available
if command -v watchman &> /dev/null; then
    echo "👁️ Clearing watchman..."
    watchman watch-del-all 2>/dev/null || true
fi

# 3. Reinstall node_modules if needed
if [ "$1" == "--full" ]; then
    echo "🗑️ Full reset - removing node_modules..."
    rm -rf node_modules
    echo "📥 Reinstalling dependencies..."
    bun install
fi

# 4. Start with clean cache
echo "🚀 Starting Expo with clean cache..."
bun x expo start --clear

echo "✅ Done! If the issue persists, run with --full flag"
