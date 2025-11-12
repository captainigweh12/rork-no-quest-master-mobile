#!/bin/bash

echo "🚀 Quick Start (bypassing health guard)..."
echo ""

# Kill existing processes
pkill -f "metro" 2>/dev/null || true
pkill -f "expo" 2>/dev/null || true
sleep 1

# Clear caches
echo "Clearing caches..."
rm -rf .expo .cache node_modules/.cache 2>/dev/null || true

# Start directly without health guard
echo ""
echo "Starting Expo..."
dotenv -e .env -- expo start -c
