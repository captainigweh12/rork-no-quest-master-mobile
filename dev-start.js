#!/usr/bin/env node

// Simple dev starter that bypasses health checks
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting development server (bypassing health checks)...\n');

// Load .env if it exists
const projectRoot = process.cwd();
require('dotenv').config({ path: path.join(projectRoot, '.env') });

// Start expo with clean cache
const expo = spawn('npx', ['expo', 'start', '-c'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

expo.on('error', (err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});

expo.on('exit', (code) => {
  process.exit(code || 0);
});
