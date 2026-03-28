#!/bin/bash
# Quick dev script that bypasses health checks
echo "Starting Expo dev server (bypassing health checks)..."
dotenv -e .env -- expo start -c --assume-dev-client
