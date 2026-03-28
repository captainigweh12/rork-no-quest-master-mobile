#!/usr/bin/env bash

# No Quest Master Mobile - Quick Start Script
# This script bypasses the health guard checks and starts the development server

echo "🚀 Starting No Quest Master Mobile development server..."
echo ""
echo "⚠️  This script bypasses TypeScript and native module checks"
echo ""

# Clear caches
echo "🧹 Clearing caches..."
rm -rf .expo node_modules/.cache .parcel-cache metro-cache

# Start with environment variables
echo "📦 Starting Expo development server..."
exec dotenv -e .env -- expo start -c
