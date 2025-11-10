#!/bin/bash

# Rebuild App - Complete cache clear and rebuild script
# This script clears all caches and rebuilds the app to prevent bundling errors

set -e

echo "🔧 Rebuilding app..."
echo ""

# Step 1: Clear all caches
echo "📦 Step 1/4: Clearing caches..."
rm -rf .expo .cache node_modules/.cache 2>/dev/null || true
echo "✓ Caches cleared"
echo ""

# Step 2: Verify babel config
echo "🔍 Step 2/4: Verifying babel.config.js..."
if [ -f "babel.config.js" ]; then
  echo "✓ babel.config.js found"
else
  echo "❌ babel.config.js not found!"
  exit 1
fi
echo ""

# Step 3: Run diagnostics
echo "🔬 Step 3/4: Running diagnostics..."
bun run diagnose
echo ""

# Step 4: Start Expo with clear cache flag
echo "🚀 Step 4/4: Starting Expo with cache clear..."
echo "Press Ctrl+C to stop when ready"
echo ""
bun x expo start -c
