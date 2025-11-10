#!/usr/bin/env node
/**
 * BABEL CONFIG FIXER
 * Safely inserts the 'module-resolver' plugin with required aliases into a default Expo babel.config.js.
 *
 * Usage:
 *   node scripts/babel-fixer.mjs          # modifies babel.config.js in place (creates a timestamped backup)
 *   node scripts/babel-fixer.mjs --dry    # preview changes only
 *   node scripts/babel-fixer.mjs --force  # if injection fails, replace with canonical config
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};
const log = (m, c='reset')=>console.log(`${COLORS[c]}${m}${COLORS.reset}`);

const DRY = process.argv.includes('--dry') || process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const ROOT = process.cwd();
const FILE = join(ROOT, 'babel.config.js');

const CANONICAL = `// babel.config.js (canonical; UTF-8, LF)
const makeConfig = function (api) {
  api && api.cache && api.cache(true);

  const isTest =
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.NODE_ENV === 'test';

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './',
          '@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk',
          '@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    'expo-router/babel',
  ];

  if (!isTest) {
    plugins.push('react-native-reanimated/plugin');
  }

  return { presets: ['babel-preset-expo', '@babel/preset-typescript'], plugins };
};

module.exports = makeConfig;
module.exports.default = makeConfig;
`;

function main() {
  log('\n🛠  Babel config fixer', 'bold');

  if (!existsSync(FILE)) {
    log('✗ babel.config.js not found in current directory', 'red');
    process.exit(1);
  }

  const buf = readFileSync(FILE);
  const isUTF16LE = buf[0] === 0xFF && buf[1] === 0xFE;
  const isUTF16BE = buf[0] === 0xFE && buf[1] === 0xFF;
  if (isUTF16LE || isUTF16BE) {
    log('✗ File is UTF-16 encoded. Please re-save as UTF-8 (no BOM) first.', 'red');
    log('  Tip: VS Code → “Reopen with Encoding… → UTF-8” → “Save with Encoding… → UTF-8”', 'yellow');
    process.exit(1);
  }

  const text = buf.toString('utf8');

  if (/['\"]module-resolver['\"]/.test(text)) {
    log('• module-resolver already present. No changes applied.', 'yellow');
    log('  If aliases are missing, consider replacing with canonical config using --force.', 'yellow');
    process.exit(0);
  }

  // Try to inject into existing plugins array.
  const pluginsMatch = text.match(/plugins\s*:\s*\[(.|\n|\r)*?\]/m);
  if (pluginsMatch) {
    const insertion = `[
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './',
          '@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk',
          '@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk'
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
      }
    ],\n`;

    const updated = text.replace(/(plugins\s*:\s*\[\s*)(?=[^\]]*\])/m, `$1${insertion}`);

    if (updated !== text) {
      if (DRY) {
        log('✓ Would inject module-resolver into plugins array (dry-run)', 'green');
        process.exit(0);
      }
      const bak = `${FILE}.bak.${Date.now()}`;
      copyFileSync(FILE, bak);
      writeFileSync(FILE, updated, { encoding: 'utf8' });
      log(`✓ Injected module-resolver. Backup saved: ${bak}`, 'green');
      process.exit(0);
    }
  }

  // If there's a return { ... } object, try inserting a new plugins property after presets
  const returnObjMatch = text.match(/return\s*\{([\s\S]*?)\};/m);
  if (returnObjMatch) {
    const hasPresets = /presets\s*:\s*\[[\s\S]*?\]/m.test(returnObjMatch[1]);
    const insertionProp = `plugins: [\n    [\n      'module-resolver',\n      {\n        root: ['./'],\n        alias: {\n          '@': './',\n          '@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk',\n          '@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk'\n        },\n        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']\n      }\n    ],\n    'expo-router/babel'\n  ],`;

    let updated = text;
    if (hasPresets) {
      updated = text.replace(/(presets\s*:\s*\[[\s\S]*?\],?)/m, `$1\n  ${insertionProp}`);
    } else {
      updated = text.replace(/return\s*\{/m, `return {\n  ${insertionProp}\n`);
    }

    if (updated !== text) {
      if (DRY) {
        log('✓ Would add plugins array with module-resolver (dry-run)', 'green');
        process.exit(0);
      }
      const bak = `${FILE}.bak.${Date.now()}`;
      copyFileSync(FILE, bak);
      writeFileSync(FILE, updated, { encoding: 'utf8' });
      log(`✓ Added plugins with module-resolver. Backup saved: ${bak}`, 'green');
      process.exit(0);
    }
  }

  // Fallback: Replace file with canonical config if --force
  if (FORCE) {
    if (DRY) {
      log('✓ Would replace babel.config.js with canonical config (dry-run)', 'green');
      process.exit(0);
    }
    const bak = `${FILE}.bak.${Date.now()}`;
    copyFileSync(FILE, bak);
    writeFileSync(FILE, CANONICAL, { encoding: 'utf8' });
    log(`✓ Replaced with canonical config. Backup saved: ${bak}`, 'green');
    process.exit(0);
  }

  log('✗ Could not inject plugin automatically. Re-run with --force to replace with canonical config.', 'red');
  process.exit(1);
}

main();
