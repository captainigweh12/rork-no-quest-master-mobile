#!/usr/bin/env bash
# REMOTE SETUP SCRIPT FOR RORK (LINUX)
# Clones the repo, ensures UTF-8 Babel config, installs deps, validates setup
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/captainigweh12/rork-no-quest-master-mobile/main/scripts/setup-remote.sh | bash
#   # or download and run locally:
#   bash setup-remote.sh

set -e

REPO_URL="https://github.com/captainigweh12/rork-no-quest-master-mobile.git"
BRANCH="main"
TARGET_DIR="/home/user/rork-app"

echo "🔧 Remote environment setup for rork"
echo "======================================"

# Ensure we're in a safe working directory (home)
cd ~

# 1) Backup existing .env if present
if [ -f "$TARGET_DIR/.env" ]; then
  echo "📦 Backing up existing .env..."
  mkdir -p ~/backup
  cp -f "$TARGET_DIR/.env" ~/backup/.env.$(date +%s)
  echo "✓ Backup saved to ~/backup/"
fi

# 2) Remove stale directory
if [ -d "$TARGET_DIR" ]; then
  echo "🗑️  Removing stale directory: $TARGET_DIR"
  rm -rf "$TARGET_DIR"
fi

# 3) Clone fresh repo
echo "📥 Cloning repository..."
if ! git clone "$REPO_URL" "$TARGET_DIR"; then
  echo "❌ Git clone failed. Possible causes:"
  echo "   - Network issue or repo URL incorrect"
  echo "   - Permission denied (try SSH key if using private repo)"
  echo "   - Parent directory doesn't exist"
  exit 1
fi

# 4) Change to the cloned directory
cd "$TARGET_DIR" || { echo "❌ Failed to enter $TARGET_DIR"; exit 1; }

# 5) Checkout target branch
echo "🔀 Checking out branch: $BRANCH"
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
git clean -fd

# 6) Restore .env if backed up
if [ -f ~/backup/.env.* ]; then
  LATEST_BACKUP=$(ls -t ~/backup/.env.* 2>/dev/null | head -n1)
  if [ -n "$LATEST_BACKUP" ]; then
    echo "📄 Restoring .env from backup..."
    cp -f "$LATEST_BACKUP" ./.env
    echo "✓ .env restored"
  fi
fi

# 7) Ensure Babel config is UTF-8 and has module-resolver
echo "🔍 Validating babel.config.js..."
if [ ! -f babel.config.js ]; then
  echo "⚠️  babel.config.js missing, creating canonical version..."
  cat > babel.config.js <<'EOF'
// babel.config.js
const makeConfig = function (api) {
  api && api.cache && api.cache(true);

  const isTest =
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.NODE_ENV === 'test';

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './',
          '@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk',
          '@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    'expo-router/babel',
  ];

  if (!isTest) {
    plugins.push('react-native-reanimated/plugin');
  }

  return {
    presets: ['babel-preset-expo', '@babel/preset-typescript'],
    plugins,
  };
};

module.exports = makeConfig;
module.exports.default = makeConfig;
EOF
  echo "✓ Created babel.config.js"
fi

# 8) Install dependencies
echo "📦 Installing dependencies..."
if command -v bun &> /dev/null; then
  bun install
  bun add -d babel-plugin-module-resolver
else
  echo "⚠️  Bun not found, falling back to npm..."
  npm install
  npm install -D babel-plugin-module-resolver
fi

# 9) Validate Babel config loads correctly
echo "🧪 Validating Babel configuration..."
VALIDATION=$(node -e "try { const m=require('./babel.config.js'); const fn=m.default||m; const out=(typeof fn==='function'?fn({cache:()=>{}}):fn)||{}; const mr=(out.plugins||[]).find(p=>Array.isArray(p)&&p[0]==='module-resolver'); console.log(!!mr ? 'OK' : 'MISSING'); } catch(e) { console.log('ERROR'); }")

if [ "$VALIDATION" = "OK" ]; then
  echo "✅ Babel config valid (module-resolver found)"
else
  echo "❌ Babel config issue detected: $VALIDATION"
  exit 1
fi

# 10) Clear caches
echo "🧹 Clearing caches..."
rm -rf .expo .cache node_modules/.cache

# 11) Final validation
echo ""
echo "✅ Setup complete!"
echo ""
echo "📍 Current state:"
echo "   Directory: $(pwd)"
echo "   Branch: $(git branch --show-current)"
echo "   Commit: $(git rev-parse --short HEAD)"
echo ""
echo "🚀 Ready to start:"
echo "   bun run start:auto    # auto-fix + start"
echo "   bun run diagnose      # check for issues"
echo "   bun run doctor        # fix + diagnose + start"
echo ""
