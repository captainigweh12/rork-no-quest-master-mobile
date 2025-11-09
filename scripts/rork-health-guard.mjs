// scripts/rork-health-guard.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIX_MODE = process.argv.includes('--fix');
const CLEAN_ONLY = process.argv.includes('--clean-only');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_DIRS = ['app', 'src', 'packages', 'components'].map(p => path.join(PROJECT_ROOT, p));
const MUST_BE_UTF8 = [
  'app.config.ts','app.config.js','babel.config.js','tsconfig.json','.eslintrc','metro.config.js',
  'eas.json','package.json','.env','.env.development','.env.production'
].map(p => path.join(PROJECT_ROOT, p));

const UTF16_LE = [0xff, 0xfe];
const UTF16_BE = [0xfe, 0xff];
const UTF8_BOM  = [0xef, 0xbb, 0xbf];

const red = s => `\x1b[31m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;
const gray = s => `\x1b[90m${s}\x1b[0m`;

const problemList = [];

function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function listFilesRec(dir, exts = ['.js','.jsx','.ts','.tsx','.json','.mjs','.cjs']) {
  const out = [];
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRec(full, exts));
    else if (exts.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}
function headBytes(p, n=3) {
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, 0);
  fs.closeSync(fd);
  return [...buf];
}
function convertUtf16ToUtf8(file) {
  const bytes = fs.readFileSync(file);
  let text;
  if (bytes[0] === UTF16_LE[0] && bytes[1] === UTF16_LE[1]) {
    text = bytes.slice(2).toString('utf16le');
  } else if (bytes[0] === UTF16_BE[0] && bytes[1] === UTF16_BE[1]) {
    const swapped = Buffer.alloc(bytes.length - 2);
    for (let i = 2; i < bytes.length; i += 2) {
      swapped[i-2] = bytes[i+1];
      swapped[i-1] = bytes[i];
    }
    text = swapped.toString('utf16le');
  } else {
    return false;
  }
  fs.writeFileSync(file, text, 'utf8');
  return true;
}
function stripUtf8Bom(file) {
  const bytes = fs.readFileSync(file);
  if (bytes[0] === UTF8_BOM[0] && bytes[1] === UTF8_BOM[1] && bytes[2] === UTF8_BOM[2]) {
    fs.writeFileSync(file, bytes.slice(3));
    return true;
  }
  return false;
}

function logProb(code, msg, fixNote='') {
  problemList.push({ code, msg, fixNote });
  console.log(`${red('✖')} ${msg}${fixNote ? ' ' + gray(fixNote) : ''}`);
}

function cleanCaches() {
  const targets = [
    '.expo', '.expo-shared', 'node_modules/.cache', '.parcel-cache',
    'metro-cache', 'dist', 'build'
  ].map(p => path.join(PROJECT_ROOT, p));
  for (const t of targets) {
    if (exists(t)) {
      try {
        fs.rmSync(t, { recursive: true, force: true });
        console.log(`${green('✔')} removed ${t}`);
      } catch (e) {
        console.log(`${yellow('!')} could not remove ${t}: ${e.message}`);
      }
    }
  }
}
if (CLEAN_ONLY) {
  console.log(gray('Cleaning caches only...'));
  cleanCaches();
  process.exit(0);
}

console.log(gray('Running RORK Health Guard…'));

for (const file of MUST_BE_UTF8.filter(exists)) {
  const hb = headBytes(file, 3);
  const isUtf16 = (hb[0] === UTF16_LE[0] && hb[1] === UTF16_LE[1]) || (hb[0] === UTF16_BE[0] && hb[1] === UTF16_BE[1]);
  if (isUtf16) {
    if (FIX_MODE) {
      try {
        convertUtf16ToUtf8(file);
        console.log(`${green('✔')} converted to UTF-8: ${path.relative(PROJECT_ROOT, file)}`);
      } catch (e) {
        logProb('ENCODING', `UTF-16 file: ${file}`, `(open and save as UTF-8)`);
      }
    } else {
      logProb('ENCODING', `UTF-16 file: ${file}`, `(run with --fix to convert)`);
    }
  } else if (hb[0] === UTF8_BOM[0] && hb[1] === UTF8_BOM[1] && hb[2] === UTF8_BOM[2]) {
    if (FIX_MODE) {
      stripUtf8Bom(file);
      console.log(`${green('✔')} removed UTF-8 BOM: ${path.relative(PROJECT_ROOT, file)}`);
    } else {
      logProb('BOM', `UTF-8 BOM detected: ${file}`, `(run with --fix to strip)`);
    }
  }
}

for (const file of ['tsconfig.json','package.json','eas.json'].map(p => path.join(PROJECT_ROOT, p)).filter(exists)) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    logProb('JSON', `Invalid JSON in ${file}: ${e.message}`);
  }
}

if (exists(path.join(PROJECT_ROOT, 'tsconfig.json'))) {
  const tsc = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsc', '--noEmit'], { stdio: 'pipe', cwd: PROJECT_ROOT });
  if (tsc.status !== 0) {
    logProb('TSC', 'TypeScript errors detected (tsc --noEmit failed).', '(run npx tsc --noEmit to view)');
  }
}

const pkgPath = path.join(PROJECT_ROOT, 'package.json');
let pkg = {};
if (exists(pkgPath)) {
  try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch {}
}
const deps = { ...(pkg.dependencies||{}), ...(pkg.devDependencies||{}) };
const usesMMKV = 'react-native-mmkv' in deps;
const usesNative = ['react-native-mmkv','@react-native-segmented-control/segmented-control','react-native-reanimated'].some(d => d in deps);
const usesAsyncStorage = '@react-native-async-storage/async-storage' in deps;

if (usesMMKV) {
  console.log(gray('MMKV detected.'));
}
if (usesAsyncStorage) {
  console.log(gray('AsyncStorage detected - runtime storage health guard active'));
}
if (usesNative) {
  const usingExpoGo = !process.env.EXPO_DEV_CLIENT && !process.argv.includes('--assume-dev-client');
  if (usingExpoGo) {
    logProb('EXPO_GO', 'Native modules present but EXPO Go assumed.', 'Use a Custom Dev Client via EAS or set a dynamic fallback.');
  }
}

function quickResolveScan() {
  const files = SRC_DIRS.flatMap(d => listFilesRec(d));
  const importRe = /from\s+['"](.+?)['"];?|require\(['"](.+?)['"]\)/g;
  for (const f of files) {
    const ext = path.extname(f);
    if (!['.ts','.tsx','.js','.jsx','.mjs','.cjs'].includes(ext)) continue;
    let txt = '';
    try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
    let m;
    while ((m = importRe.exec(txt))) {
      const p = m[1] || m[2];
      if (!p || !p.startsWith('.')) continue;
      const base = path.resolve(path.dirname(f), p);
      const candidates = ['', '.ts','.tsx','.js','.jsx','.mjs','.cjs','/index.ts','/index.tsx','/index.js','/index.jsx'].map(s => base + s);
      const found = candidates.some(exists);
      if (!found) {
        logProb('RESOLVE', `Possibly missing file for import "${p}" in ${f}`);
      }
    }
  }
}
quickResolveScan();

// Check for storage health guard integration
const storageGuardPath = path.join(PROJECT_ROOT, 'lib', 'emergencyStorageClear.ts');
if (exists(storageGuardPath)) {
  console.log(gray('✓ Storage health guard detected - will run at app startup'));
  console.log(gray('  - Handles AsyncStorage corruption detection'));
  console.log(gray('  - Auto-clears corrupted keys on startup'));
  console.log(gray('  - Failsafe for SyntaxError in storage values'));
}

if (FIX_MODE) {
  cleanCaches();
}

if (problemList.length) {
  console.log('\n' + yellow('RORK Health Guard found issues:'));
  for (const p of problemList) console.log(` - [${p.code}] ${p.msg}`);
  process.exit(1);
} else {
  console.log(green('✓ RORK Health Guard passed — environment looks clean.'));
}
