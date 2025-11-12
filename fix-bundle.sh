#!/bin/bash

echo "🧹 Clearing all caches..."

# Kill any running Metro bundler processes
pkill -f "metro" || true
pkill -f "expo start" || true
pkill -f "react-native start" || true

# Clear Expo caches
rm -rf .expo
rm -rf .cache

# Clear Metro cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*
rm -rf $TMPDIR/react-*

# Clear node_modules cache
rm -rf node_modules/.cache

# Clear watchman (if installed)
if command -v watchman &> /dev/null; then
    echo "📡 Clearing watchman..."
    watchman watch-del-all || true
fi

echo "✅ All caches cleared!"
echo ""
echo "Now run: bun x expo start -c"
