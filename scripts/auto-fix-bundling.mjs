#!/usr/bin/env node
/**
 * AUTOMATED BUNDLING FIX
 * 
 * Automatically fixes common bundling issues:
 * - Corrects wrong Rork SDK imports
 * - Ensures babel config has correct aliases
 * - Clears stale caches
 * - Verifies the fixes
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = process.cwd();
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

class BundlingAutoFix {
  constructor() {
    this.fixCount = 0;
    this.errors = [];
  }

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  logSection(title) {
    this.log(`\n${'='.repeat(60)}`, 'cyan');
    this.log(`  ${title}`, 'cyan');
    this.log('='.repeat(60), 'cyan');
  }

  async fixIncorrectImports() {
    this.logSection('FIXING INCORRECT RORK SDK IMPORTS');

    try {
      const { globSync } = await import('glob');
      const files = globSync('{app,components,contexts,services,lib,hooks,providers}/**/*.{ts,tsx,js,jsx}', {
        cwd: PROJECT_ROOT,
        ignore: ['**/node_modules/**', '**/.expo/**', '**/dist/**'],
      });

      let fixedFiles = 0;
      const incorrectImport = '@rork-ai/toolkit-sdk';
      const correctImport = '@rork-ai/toolkit-sdk';

      for (const file of files) {
        const fullPath = join(PROJECT_ROOT, file);
        if (!existsSync(fullPath)) continue;

        let content = readFileSync(fullPath, 'utf-8');
        const originalContent = content;

        // Replace all instances of @rork/toolkit-sdk with @rork-ai/toolkit-sdk
        content = content.replace(/@rork\/toolkit-sdk/g, correctImport);

        if (content !== originalContent) {
          writeFileSync(fullPath, content, 'utf-8');
          this.log(`✓ Fixed imports in ${file}`, 'green');
          fixedFiles++;
        }
      }

      if (fixedFiles > 0) {
        this.log(`\n✓ Fixed ${fixedFiles} file(s)`, 'green');
        this.fixCount += fixedFiles;
      } else {
        this.log('✓ No incorrect imports found', 'green');
      }
    } catch (error) {
      this.log(`✗ Error fixing imports: ${error.message}`, 'red');
      this.errors.push(`Import fix failed: ${error.message}`);
    }
  }

  async verifyBabelConfig() {
    this.logSection('VERIFYING BABEL CONFIGURATION');

    const babelConfigPath = join(PROJECT_ROOT, 'babel.config.js');
    
    if (!existsSync(babelConfigPath)) {
      this.log('✗ babel.config.js not found', 'red');
      this.errors.push('babel.config.js not found');
      return;
    }

    try {
      const content = readFileSync(babelConfigPath, 'utf-8');
      
      // Check for correct aliases
      const hasAtAlias = content.includes("'@': './'") || content.includes('"@": "./"');
      const hasRorkAlias = 
        content.includes("'@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk'") ||
        content.includes('"@rork-ai/toolkit-sdk": "./stubs/rork-toolkit-sdk"');

      if (hasAtAlias && hasRorkAlias) {
        this.log('✓ Babel config has all required aliases', 'green');
      } else {
        this.log('⚠ Babel config may be missing required aliases', 'yellow');
        
        if (!hasAtAlias) {
          this.log("  Missing '@' alias", 'yellow');
        }
        if (!hasRorkAlias) {
          this.log("  Missing '@rork-ai/toolkit-sdk' alias", 'yellow');
        }

        this.log('\n💡 Expected babel.config.js structure:', 'cyan');
        this.log(`
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
]`, 'yellow');
      }

      // Check for debug console.log
      if (!content.includes("console.log('>> Using babel config at:', __filename)")) {
        this.log('\n💡 Tip: Add debug line to verify babel config is loaded:', 'cyan');
        this.log("  console.log('>> Using babel config at:', __filename);", 'yellow');
      }
    } catch (error) {
      this.log(`✗ Error reading babel config: ${error.message}`, 'red');
      this.errors.push(`Babel config check failed: ${error.message}`);
    }
  }

  async clearCaches() {
    this.logSection('CLEARING STALE CACHES');

    const cacheDirs = [
      '.expo',
      '.cache',
      'node_modules/.cache',
      '.metro-cache',
    ];

    let clearedDirs = 0;
    for (const dir of cacheDirs) {
      const fullPath = join(PROJECT_ROOT, dir);
      if (existsSync(fullPath)) {
        try {
          rmSync(fullPath, { recursive: true, force: true });
          this.log(`✓ Cleared ${dir}`, 'green');
          clearedDirs++;
        } catch (error) {
          this.log(`⚠ Could not clear ${dir}: ${error.message}`, 'yellow');
        }
      }
    }

    if (clearedDirs > 0) {
      this.log(`\n✓ Cleared ${clearedDirs} cache director${clearedDirs === 1 ? 'y' : 'ies'}`, 'green');
      this.fixCount += clearedDirs;
    } else {
      this.log('✓ No stale caches found', 'green');
    }
  }

  async verifyStubFiles() {
    this.logSection('VERIFYING STUB FILES');

    const stubFiles = [
      'stubs/rork-toolkit-sdk.ts',
      'stubs/rork-ai-toolkit-dev-sdk.ts',
    ];

    let allPresent = true;
    for (const stub of stubFiles) {
      const fullPath = join(PROJECT_ROOT, stub);
      if (existsSync(fullPath)) {
        this.log(`✓ ${stub} exists`, 'green');
      } else {
        this.log(`✗ ${stub} missing`, 'red');
        this.errors.push(`Stub file missing: ${stub}`);
        allPresent = false;
      }
    }

    return allPresent;
  }

  async runDiagnostics() {
    this.logSection('RUNNING POST-FIX DIAGNOSTICS');

    try {
      this.log('Running: bun run diagnose\n', 'cyan');
      
      execSync('bun run diagnose', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
      });
      
      return true;
    } catch (error) {
      this.log('\n⚠ Diagnostics found remaining issues', 'yellow');
      return false;
    }
  }

  async run() {
    this.log('\n🔧 AUTOMATED BUNDLING FIX', 'bold');
    this.log('Automatically fixing common bundling issues...\n', 'cyan');

    // Step 1: Fix incorrect imports
    await this.fixIncorrectImports();

    // Step 2: Verify babel config
    await this.verifyBabelConfig();

    // Step 3: Verify stub files
    await this.verifyStubFiles();

    // Step 4: Clear caches
    await this.clearCaches();

    // Generate summary
    this.logSection('FIX SUMMARY');

    if (this.errors.length === 0) {
      this.log(`✓ Applied ${this.fixCount} fix(es) successfully`, 'green');
    } else {
      this.log(`⚠ Applied ${this.fixCount} fix(es) with ${this.errors.length} error(s)`, 'yellow');
      this.log('\nErrors encountered:', 'red');
      this.errors.forEach((err, i) => {
        this.log(`  ${i + 1}. ${err}`, 'red');
      });
    }

    // Step 5: Run diagnostics to verify
    const diagnosticsPass = await this.runDiagnostics();

    // Final result
    this.logSection('FINAL RESULT');

    if (diagnosticsPass && this.errors.length === 0) {
      this.log('✓ All fixes applied successfully!', 'green');
      this.log('✓ Ready to start bundling', 'green');
      this.log('\n💡 Next step:', 'cyan');
      this.log('  bun run start', 'cyan');
      process.exit(0);
    } else {
      this.log('⚠ Some issues may remain', 'yellow');
      this.log('\n💡 Manual steps required:', 'cyan');
      
      if (this.errors.some(e => e.includes('babel.config.js'))) {
        this.log('\n1. Verify babel.config.js has correct aliases:', 'yellow');
        this.log("   - '@': './'", 'yellow');
        this.log("   - '@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk'", 'yellow');
      }

      if (this.errors.some(e => e.includes('stub'))) {
        this.log('\n2. Ensure stub files exist in stubs/ directory', 'yellow');
      }

      this.log('\n3. Try starting the bundler:', 'yellow');
      this.log('   bun run start', 'yellow');

      process.exit(1);
    }
  }
}

const autoFix = new BundlingAutoFix();
autoFix.run().catch((error) => {
  console.error('Auto-fix failed:', error);
  process.exit(1);
});
