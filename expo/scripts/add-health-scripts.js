#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const newScripts = {
  "rork:guard": "node scripts/rork-health-guard.mjs",
  "rork:guard:fix": "node scripts/rork-health-guard.mjs --fix",
  "rork:clean": "node scripts/rork-health-guard.mjs --clean-only",
  "storage:check": "node scripts/check-storage-health.js",
  "storage:diagnose": "node scripts/diagnose-asyncstorage.js",
  "dev": "node scripts/rork-health-guard.mjs && dotenv -e .env -- expo start -c",
  "dev:fix": "node scripts/rork-health-guard.mjs --fix && dotenv -e .env -- expo start -c",
};

pkg.scripts = {
  ...newScripts,
  ...pkg.scripts,
};

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

console.log('✅ Added health guard scripts to package.json');
console.log('\nNew scripts:');
Object.keys(newScripts).forEach(key => {
  console.log(`  - npm run ${key}`);
});
