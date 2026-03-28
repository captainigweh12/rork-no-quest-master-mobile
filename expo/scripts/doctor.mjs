#!/usr/bin/env node
/**
 * RORK DOCTOR
 * Runs fix (with diagnostics) and then starts the bundler.
 *
 * Usage examples:
 *   node scripts/doctor.mjs               # native Expo Go
 *   node scripts/doctor.mjs --tunnel      # native with tunnel
 *   node scripts/doctor.mjs --web         # web
 *   node scripts/doctor.mjs --web --tunnel
 *   node scripts/doctor.mjs -- --port 8082  # pass extra flags to Expo
 */

import { execSync } from 'child_process';

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

function parseArgs(argv) {
  const args = argv.slice(2);
  const sep = args.indexOf('--');
  const raw = sep >= 0 ? args.slice(0, sep) : args;
  const extras = sep >= 0 ? args.slice(sep + 1) : [];

  return {
    web: raw.includes('--web'),
    tunnel: raw.includes('--tunnel'),
    force: raw.includes('--force'),
    extras,
  };
}

function run(cmd) {
  log(`\n$ ${cmd}`, 'cyan');
  execSync(cmd, { stdio: 'inherit' });
}

async function main() {
  log('\n🩺 Rork Doctor: fix → diagnose → start', 'bold');

  // 1) Fix (includes diagnostics by default)
  try {
    run('node scripts/bundle-fix.mjs');
  } catch (e) {
    const { force } = parseArgs(process.argv);
    if (force) {
      log('\n⚠ Fix/diagnose reported issues, continuing due to --force.', 'yellow');
    } else {
      log('\n✗ Fix/diagnose reported issues. Aborting start.', 'red');
      log('  Tip: run "bun run diagnose" and resolve errors, or rerun with --force.', 'yellow');
      process.exit(1);
    }
  }

  // 2) Start
  const { web, tunnel, extras } = parseArgs(process.argv);

  let script = 'start';
  if (web && tunnel) script = 'start-web:tunnel';
  else if (web) script = 'start-web';
  else if (tunnel) script = 'start:tunnel';

  const extraFlags = extras.length ? ` -- ${extras.map(x => x.replace(/"/g, '\\"')).join(' ')}` : '';
  const cmd = `bun run ${script}${extraFlags}`;

  log(`\n🚀 Starting Expo via "${script}"`, 'green');
  run(cmd);
}

main().catch((err) => {
  log(`Doctor failed: ${err?.message || err}`, 'red');
  process.exit(1);
});
