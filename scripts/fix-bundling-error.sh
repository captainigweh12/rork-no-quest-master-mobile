#!/bin/bash

# Fix Bundling Error - Complete automated fix script
# This script fixes the "Bundling failed" and "Cannot determine Expo SDK version" errors

set -e

echo "🔧 BUNDLING ERROR FIX"
echo "=================================="
echo ""

# Step 1: Clean babel.config.js (remove debug console.log)
echo "🧹 Step 1/5: Cleaning babel.config.js..."
if [ -f "babel.config.js" ]; then
  # Check if console.log line exists
  if grep -q "console\.log('>> Using babel config at:'," babel.config.js; then
    # Create backup
    cp babel.config.js babel.config.js.backup
    # Remove the console.log line
    grep -v "console\.log('>> Using babel config at:'," babel.config.js > babel.config.js.tmp
    mv babel.config.js.tmp babel.config.js
    echo "✓ Removed debug console.log from babel.config.js"
  else
    echo "✓ babel.config.js is already clean"
  fi
else
  echo "❌ babel.config.js not found!"
  exit 1
fi
echo ""

# Step 2: Clear all caches
echo "📦 Step 2/5: Clearing all caches..."
rm -rf .expo .cache node_modules/.cache 2>/dev/null || true
echo "✓ Caches cleared"
echo ""

# Step 3: Reinstall node_modules
echo "📥 Step 3/5: Reinstalling dependencies..."
echo "This may take a few minutes..."
rm -rf node_modules 2>/dev/null || true
bun install
echo "✓ Dependencies reinstalled"
echo ""

# Step 4: Verify expo is installed
echo "🔍 Step 4/5: Verifying Expo installation..."
if [ -d "node_modules/expo" ]; then
  echo "✓ Expo module found"
  EXPO_VERSION=$(node -e "console.log(require('./node_modules/expo/package.json').version)" 2>/dev/null || echo "unknown")
  echo "✓ Expo version: $EXPO_VERSION"
else
  echo "❌ Expo module not found in node_modules!"
  exit 1
fi
echo ""

# Step 5: Verify babel config
echo "🔍 Step 5/5: Verifying babel config..."
node -e "
try {
  const m = require('./babel.config.js');
  const fn = m.default || m;
  const cfg = typeof fn === 'function' ? fn({cache: () => {}}) : fn;
  const plugins = cfg.plugins || [];
  const mr = plugins.find(p => Array.isArray(p) && p[0] === 'module-resolver');
  if (mr && mr[1] && mr[1].alias) {
    console.log('✓ Babel config is valid');
    console.log('✓ Found aliases:', Object.keys(mr[1].alias).join(', '));
  } else {
    console.log('⚠ Module resolver not found (but may be OK)');
  }
} catch (e) {
  console.log('⚠ Babel config warning:', e.message);
}
"
echo ""

echo "=================================="
echo "✅ FIX COMPLETE!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Run: bun x expo start -c"
echo "2. Or run: bun run start"
echo ""
