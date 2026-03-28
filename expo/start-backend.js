#!/usr/bin/env node

/**
 * Backend Starter Script with Process Management
 * Handles graceful startup, stale process cleanup, and error recovery
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);
const PID_FILE = path.join(process.cwd(), '.backend-process.pid');

console.log('🚀 Starting backend server...\n');

// Clean up any stale PID file or processes
async function cleanupStaleProcesses() {
  try {
    // Check if PID file exists
    if (fs.existsSync(PID_FILE)) {
      const oldPid = fs.readFileSync(PID_FILE, 'utf-8').trim();
      console.log(`⚠️  Found stale PID file with PID: ${oldPid}`);
      
      // Try to kill the old process
      const isWindows = process.platform === 'win32';
      try {
        if (isWindows) {
          await execAsync(`taskkill /F /PID ${oldPid}`);
          console.log(`✅ Killed stale process ${oldPid}`);
        } else {
          await execAsync(`kill -9 ${oldPid}`);
          console.log(`✅ Killed stale process ${oldPid}`);
        }
      } catch (error) {
        // Process might not exist, that's fine
        console.log(`   Process ${oldPid} already terminated`);
      }
      
      // Remove stale PID file
      fs.unlinkSync(PID_FILE);
      console.log('✅ Cleaned up stale PID file\n');
    }
  } catch (error) {
    console.error('⚠️  Error during cleanup:', error.message);
  }
}

// Kill any process on port 8081
async function killProcessOnPort() {
  const port = 8081;
  const isWindows = process.platform === 'win32';
  
  console.log(`🔍 Checking for processes on port ${port}...`);
  
  try {
    if (isWindows) {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) {
          const pid = match[1];
          console.log(`   Found process ${pid} on port ${port}, terminating...`);
          await execAsync(`taskkill /F /PID ${pid}`);
          console.log(`   ✅ Killed process ${pid}`);
        }
      }
    } else {
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      const pids = stdout.trim().split('\n').filter(Boolean);
      
      for (const pid of pids) {
        console.log(`   Found process ${pid} on port ${port}, terminating...`);
        await execAsync(`kill -9 ${pid}`);
        console.log(`   ✅ Killed process ${pid}`);
      }
    }
    console.log('✅ Port cleanup complete\n');
  } catch (error) {
    // No process on port, that's fine
    console.log('   No process found on port 8081\n');
  }
}

// Run cleanup before starting server
(async () => {
  await cleanupStaleProcesses();
  await killProcessOnPort();
  startServer();
})();

function startServer() {
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

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('\n👋 Shutting down backend server...');
      proc.kill('SIGTERM');
      
      setTimeout(() => {
        if (!proc.killed) {
          console.log('⚠️  Force killing process...');
          proc.kill('SIGKILL');
        }
      }, 5000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

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
}
