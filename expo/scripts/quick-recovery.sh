#!/usr/bin/env bash
# QUICK FIX for failed setup
# Run this if the automated setup script failed mid-way

set -e

echo "🔧 Quick recovery script"
echo ""

# Go to home directory (safe location)
cd ~

# Remove any partial clone
echo "Cleaning up..."
rm -rf /home/user/rork-app

# Create parent directory structure if needed
mkdir -p /home/user

# Clone fresh
echo "Cloning repository..."
git clone https://github.com/captainigweh12/rork-no-quest-master-mobile.git /home/user/rork-app

# Enter directory
cd /home/user/rork-app

# Install deps
echo "Installing dependencies..."
if command -v bun &> /dev/null; then
  bun install
else
  npm install
fi

# Verify scripts exist
echo ""
echo "Checking for required scripts..."
if [ -f "scripts/start-auto.mjs" ]; then
  echo "✓ start-auto.mjs found"
else
  echo "✗ start-auto.mjs missing (repo may be incomplete)"
fi

if [ -f "babel.config.js" ]; then
  echo "✓ babel.config.js found"
else
  echo "✗ babel.config.js missing"
fi

# Show available commands
echo ""
echo "✅ Recovery complete!"
echo ""
echo "Available commands:"
cat package.json | grep -A 1 '"start:auto"' || echo "⚠️  start:auto not found in package.json"
echo ""
echo "Try running:"
echo "  bun run start:auto"
echo "  bun run diagnose"
echo "  bun run doctor"
echo ""
