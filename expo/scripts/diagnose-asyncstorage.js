#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing AsyncStorage state...\n');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const STORAGE_FILES = [
  'lib/storage/adapter.ts',
  'lib/storage/healthGuard.ts',
  'lib/localStorage.ts',
  'lib/sqliteStorage.ts',
  'lib/mmkvStorage.ts',
  'lib/storage.ts',
];

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

let issues = [];

for (const file of STORAGE_FILES) {
  const fullPath = path.join(PROJECT_ROOT, file);
  if (!exists(fullPath)) {
    console.log(`⚠️  Missing: ${file}`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  if (content.includes('@react-native-async-storage/async-storage')) {
    console.log(`✅ ${file} - uses AsyncStorage`);
  }

  if (content.includes('react-native-mmkv')) {
    console.log(`📦 ${file} - references MMKV`);
  }

  if (content.includes('JSON.parse(') && !content.includes('try')) {
    console.log(`⚠️  ${file} - has unguarded JSON.parse`);
    issues.push(file);
  }
}

console.log('\n--- Storage Implementation Check ---');
const adapterPath = path.join(PROJECT_ROOT, 'lib/storage/adapter.ts');
if (exists(adapterPath)) {
  const adapter = fs.readFileSync(adapterPath, 'utf8');
  if (adapter.includes('AsyncStorage')) {
    console.log('✅ Storage adapter includes AsyncStorage fallback');
  }
  if (adapter.includes('MMKV')) {
    console.log('✅ Storage adapter supports MMKV');
  }
  if (adapter.includes('global') && adapter.includes('expoGo')) {
    console.log('✅ Storage adapter has Expo Go detection');
  }
} else {
  console.log('❌ Storage adapter not found');
}

console.log('\n--- Health Guard Check ---');
const guardPath = path.join(PROJECT_ROOT, 'lib/storage/healthGuard.ts');
if (exists(guardPath)) {
  const guard = fs.readFileSync(guardPath, 'utf8');
  if (guard.includes('safeParse')) {
    console.log('✅ Health guard has safe JSON parsing');
  }
  if (guard.includes('nuclearClear')) {
    console.log('✅ Health guard has nuclear clear function');
  }
  if (guard.includes('autoErase')) {
    console.log('✅ Health guard supports auto-erase mode');
  }
} else {
  console.log('❌ Health guard not found');
}

if (issues.length > 0) {
  console.log(`\n⚠️  Found ${issues.length} files with potential JSON.parse issues`);
  process.exit(1);
} else {
  console.log('\n✅ AsyncStorage implementation looks good');
  process.exit(0);
}
