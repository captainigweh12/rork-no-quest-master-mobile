#!/usr/bin/env node
/**
 * AUTO SYNC SCRIPT
 * Fetches canonical config/stub files from GitHub and writes them into this project.
 * Intended for remote envs without git, to align with the main repo state.
 *
 * Usage:
 *   node scripts/auto-sync.mjs                          # default: owner=captainigweh12 repo=rork-no-quest-master-mobile ref=main
 *   node scripts/auto-sync.mjs --ref my-branch          # sync from a different branch/commit/sha
 *   node scripts/auto-sync.mjs --owner me --repo repo   # sync from a different repo
 *   node scripts/auto-sync.mjs --dry-run                # print actions only
 *   node scripts/auto-sync.mjs --diagnose               # run diagnose after syncing
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import https from 'https';
import { execSync } from 'child_process';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};
function log(msg, color = 'reset') { console.log(`${COLORS[color]}${msg}${COLORS.reset}`); }

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = { owner: 'captainigweh12', repo: 'rork-no-quest-master-mobile', ref: 'main', dryRun: false, diagnose: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--owner') out.owner = args[++i];
    else if (a === '--repo') out.repo = args[++i];
    else if (a === '--ref') out.ref = args[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--diagnose') out.diagnose = true;
  }
  return out;
}

const FILES = [
  // Root config
  { path: 'babel.config.js' },
  // Stubs
  { path: 'stubs/rork-toolkit-sdk.ts' },
  { path: 'stubs/rork-ai-toolkit-dev-sdk.ts' },
  // Helper scripts
  { path: 'scripts/bundle-diagnostics.mjs' },
  { path: 'scripts/bundle-fix.mjs' },
  { path: 'scripts/doctor.mjs' },
];

function fetchRaw({ owner, repo, ref, path }) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

async function syncFile(root, opts, file) {
  const target = join(root, file.path);
  const dir = dirname(target);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    log(`• Created dir ${dir}`, 'yellow');
  }

  log(`↻ Syncing ${file.path} ...`, 'cyan');
  const remoteContent = await fetchRaw({ owner: opts.owner, repo: opts.repo, ref: opts.ref, path: file.path });

  if (opts.dryRun) {
    log(`(dry-run) Would write ${file.path} (${remoteContent.length} bytes)`, 'yellow');
    return { changed: false, skipped: true };
  }

  let changed = true;
  if (existsSync(target)) {
    try {
      const local = readFileSync(target, 'utf8');
      if (local === remoteContent) {
        changed = false;
      }
    } catch {}
  }

  // Write as UTF-8 (no BOM) to prevent encoding issues
  writeFileSync(target, remoteContent, { encoding: 'utf8', flag: 'w' });
  if (changed) log(`✓ Updated ${file.path}`, 'green');
  else log(`• Unchanged ${file.path}`, 'yellow');
  return { changed, skipped: false };
}

async function main() {
  const cwd = process.cwd();
  const opts = parseArgs(process.argv);

  log('\n🔄 Auto-syncing config and stubs from GitHub', 'bold');
  log(`Repo: ${opts.owner}/${opts.repo} @ ${opts.ref}`, 'cyan');

  let changes = 0;
  for (const f of FILES) {
    try {
      const res = await syncFile(cwd, opts, f);
      if (res.changed) changes++;
    } catch (e) {
      log(`✗ Failed to sync ${f.path}: ${e.message}`, 'red');
    }
  }

  log(`\n✔ Sync complete. Files updated: ${changes}`, 'green');

  if (opts.diagnose) {
    log('\n🔬 Running diagnostics...', 'cyan');
    try {
      execSync('node scripts/bundle-diagnostics.mjs', { stdio: 'inherit' });
      log('\n✅ Diagnostics passed', 'green');
    } catch {
      log('\n⚠ Diagnostics reported issues. Review output above.', 'yellow');
      process.exit(1);
    }
  }
}

main().catch((err) => {
  log(`Auto-sync failed: ${err?.message || err}`, 'red');
  process.exit(1);
});
