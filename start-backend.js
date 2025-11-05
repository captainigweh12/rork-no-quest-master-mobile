#!/usr/bin/env node

/**
 * Simple backend starter script
 * This script starts the backend server without requiring tsx
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend server...\n');

// Try different methods to start the server
const methods = [
  {
    name: 'npx tsx',
    command: 'npx',
    args: ['tsx', path.join('backend', 'server.ts')],
  },
  {
    name: 'node with tsx loader',
    command: 'node',
    args: ['--loader', 'tsx', path.join('backend', 'server.ts')],
  },
  {
    name: 'ts-node',
    command: 'npx',
    args: ['ts-node', '--esm', path.join('backend', 'server.ts')],
  },
];

let currentMethod = 0;

function tryStartServer() {
  if (currentMethod >= methods.length) {
    console.error('\n❌ Failed to start backend with all methods.');
    console.error('\n💡 Solutions:');
    console.error('   1. Install tsx: npm install -D tsx');
    console.error('   2. Or install ts-node: npm install -D ts-node');
    console.error('   3. Or install bun: https://bun.sh');
    console.error('   4. Then run: npm run backend\n');
    process.exit(1);
  }

  const method = methods[currentMethod];
  console.log(`Trying method ${currentMethod + 1}/${methods.length}: ${method.name}...`);

  const proc = spawn(method.command, method.args, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });

  proc.on('error', (err) => {
    console.error(`\n⚠️  Method failed: ${err.message}`);
    currentMethod++;
    tryStartServer();
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n⚠️  Method exited with code ${code}`);
      currentMethod++;
      tryStartServer();
    }
  });

  // If process is still running after 2 seconds, consider it successful
  setTimeout(() => {
    if (!proc.killed) {
      console.log(`\n✅ Backend started successfully with: ${method.name}\n`);
    }
  }, 2000);
}

tryStartServer();
