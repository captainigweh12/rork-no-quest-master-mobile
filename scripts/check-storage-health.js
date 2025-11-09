#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const CRITICAL_FILES = [
  'lib/storage/adapter.ts',
  'lib/storage/healthGuard.ts',
  'app/_layout.tsx',
  'app.config.ts',
  'babel.config.js',
  'tsconfig.json',
  'package.json',
];

const UTF16_LE = [0xff, 0xfe];
const UTF16_BE = [0xfe, 0xff];
const UTF8_BOM = [0xef, 0xbb, 0xbf];

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function headBytes(p, n = 3) {
  try {
    const fd = fs.openSync(p, 'r');
    const buf = Buffer.alloc(n);
    fs.readSync(fd, buf, 0, n, 0);
    fs.closeSync(fd);
    return [...buf];
  } catch (e) {
    console.error(`Error reading ${p}:`, e.message);
    return [];
  }
}

function checkFile(file) {
  const fullPath = path.join(PROJECT_ROOT, file);
  if (!exists(fullPath)) {
    console.log(`⚠️  Missing: ${file}`);
    return false;
  }

  const hb = headBytes(fullPath, 3);
  const isUtf16 =
    (hb[0] === UTF16_LE[0] && hb[1] === UTF16_LE[1]) ||
    (hb[0] === UTF16_BE[0] && hb[1] === UTF16_BE[1]);
  const hasBOM = hb[0] === UTF8_BOM[0] && hb[1] === UTF8_BOM[1] && hb[2] === UTF8_BOM[2];

  if (isUtf16) {
    console.log(`❌ UTF-16 encoding: ${file}`);
    return false;
  }
  if (hasBOM) {
    console.log(`⚠️  UTF-8 BOM: ${file}`);
    return false;
  }

  if (file.endsWith('.json')) {
    try {
      JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
      console.log(`❌ Invalid JSON: ${file} - ${e.message}`);
      return false;
    }
  }

  return true;
}

console.log('🔍 Checking storage health files...\n');

let allOk = true;
for (const file of CRITICAL_FILES) {
  if (!checkFile(file)) {
    allOk = false;
  }
}

if (allOk) {
  console.log('\n✅ All storage health files are valid');
  process.exit(0);
} else {
  console.log('\n❌ Some files have issues. Run "npm run rork:guard:fix" to auto-fix');
  process.exit(1);
}
