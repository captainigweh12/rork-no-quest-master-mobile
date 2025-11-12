#!/bin/bash
set -e

echo "🔧 Fixing Bundle Key Not Found Error..."
echo ""

# Step 1: Kill existing processes
echo "1️⃣ Killing existing Metro/Expo processes..."
pkill -f "metro" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
pkill -f "node.*8081" 2>/dev/null || true
sleep 2

# Step 2: Clear all caches
echo ""
echo "2️⃣ Clearing caches..."
rm -rf .expo
rm -rf .cache
rm -rf node_modules/.cache
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-map-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true

# Clear watchman if available
if command -v watchman &> /dev/null; then
    echo "   Clearing watchman..."
    watchman watch-del-all 2>/dev/null || true
fi

# Step 3: Reinstall dependencies (fixes React version mismatches)
echo ""
echo "3️⃣ Reinstalling dependencies..."
bun install

# Step 4: Start with clean cache
echo ""
echo "4️⃣ Starting Expo with clean cache..."
echo ""
echo "================================================"
echo "✅ Setup complete! Starting Expo..."
echo "================================================"
echo ""

bun x expo start -c
