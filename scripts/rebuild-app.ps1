# Rebuild App - Complete cache clear and rebuild script
# This script clears all caches and rebuilds the app to prevent bundling errors

Write-Host "🔧 Rebuilding app..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear all caches
Write-Host "📦 Step 1/4: Clearing caches..." -ForegroundColor Yellow
if (Test-Path ".expo") { Remove-Item -Recurse -Force ".expo" -ErrorAction SilentlyContinue }
if (Test-Path ".cache") { Remove-Item -Recurse -Force ".cache" -ErrorAction SilentlyContinue }
if (Test-Path "node_modules/.cache") { Remove-Item -Recurse -Force "node_modules/.cache" -ErrorAction SilentlyContinue }
Write-Host "✓ Caches cleared" -ForegroundColor Green
Write-Host ""

# Step 2: Verify babel config
Write-Host "🔍 Step 2/4: Verifying babel.config.js..." -ForegroundColor Yellow
if (Test-Path "babel.config.js") {
  Write-Host "✓ babel.config.js found" -ForegroundColor Green
} else {
  Write-Host "❌ babel.config.js not found!" -ForegroundColor Red
  exit 1
}
Write-Host ""

# Step 3: Run diagnostics
Write-Host "🔬 Step 3/4: Running diagnostics..." -ForegroundColor Yellow
bun run diagnose
Write-Host ""

# Step 4: Start Expo with clear cache flag
Write-Host "🚀 Step 4/4: Starting Expo with cache clear..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop when ready" -ForegroundColor Cyan
Write-Host ""
bun x expo start -c
