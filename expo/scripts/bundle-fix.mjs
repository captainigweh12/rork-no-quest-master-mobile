#!/usr/bin/env node
/**
 * BUNDLING QUICK FIX
 *
 * Clears Expo/Metro caches safely across platforms and optionally runs diagnostics.
 */

import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const runDiagnose = !args.has('--no-diagnose');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

function removeDir(rel) {
  const p = join(ROOT, rel);
  if (existsSync(p)) {
    try {
      rmSync(p, { recursive: true, force: true });
      log(`✓ Removed ${rel}`, 'green');
    } catch (e) {
      log(`✗ Failed to remove ${rel}: ${e.message}`, 'red');
    }
  } else {
    log(`• Skipped ${rel} (not present)`, 'yellow');
  }
}

function main() {
  log('\n🧹 Bundling quick fix: clearing caches', 'bold');

  removeDir('.expo');
  removeDir('.cache');
  removeDir(join('node_modules', '.cache'));

  log('\n✔ Cache cleanup complete', 'green');

  if (!runDiagnose) {
    log('\nℹ Skipping diagnostics (use without --no-diagnose to run)', 'yellow');
    return 0;
  }

  log('\n🔬 Running diagnostics...', 'cyan');
  try {
    execSync('node scripts/bundle-diagnostics.mjs', { stdio: 'inherit' });
    log('\n✅ Diagnostics passed', 'green');
    return 0;
  } catch (e) {
    log('\n⚠ Diagnostics reported issues. See above for details.', 'yellow');
    return 1;
  }
}

const code = main();
process.exit(code);
