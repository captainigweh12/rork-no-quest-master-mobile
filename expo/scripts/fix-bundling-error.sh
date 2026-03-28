#!/bin/bash

# Bundling Error Fix Script
# Comprehensive fix for "Bundling failed without error" issues

set -e

echo "🔧 Bundling Error Fix Script"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Remove debug console.log from babel.config.js
echo "📝 Step 1: Cleaning babel.config.js..."
if grep -q "console.log('>> Using babel config" babel.config.js 2>/dev/null; then
    sed -i '/console\.log.*Using babel config/d' babel.config.js
    echo -e "${GREEN}✓ Removed debug console.log from babel.config.js${NC}"
else
    echo -e "${GREEN}✓ babel.config.js is already clean${NC}"
fi

# Step 2: Clear all caches
echo ""
echo "🗑️  Step 2: Clearing caches..."
rm -rf .expo .cache node_modules/.cache 2>/dev/null || true
echo -e "${GREEN}✓ Caches cleared${NC}"

# Step 3: Verify node_modules
echo ""
echo "📦 Step 3: Verifying dependencies..."
if [ ! -d "node_modules" ] || [ ! -d "node_modules/expo" ]; then
    echo -e "${YELLOW}⚠ node_modules missing or incomplete, installing...${NC}"
    bun install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies present${NC}"
fi

# Step 4: Run diagnostics
echo ""
echo "🔬 Step 4: Running diagnostics..."
if bun run diagnose; then
    echo -e "${GREEN}✓ All diagnostics passed${NC}"
else
    echo -e "${YELLOW}⚠ Some diagnostics failed (check output above)${NC}"
fi

# Step 5: Final instructions
echo ""
echo "=============================="
echo -e "${GREEN}✅ Fix script completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: bun run start"
echo "2. If bundling still fails, check the error message"
echo "3. Run: bun run diagnose for detailed analysis"
echo ""
