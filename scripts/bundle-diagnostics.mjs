#!/usr/bin/env node

/**
 * BUNDLING FAILURE DIAGNOSTICS
 * 
 * Identifies and diagnoses common bundling failures before they happen.
 * Catches module resolution errors, missing aliases, and configuration issues.
 */

import { readFileSync, existsSync } from 'fs';
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

class BundleDiagnostics {
  constructor() {
    this.issues = [];
    this.warnings = [];
  }

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  logSection(title) {
    this.log(`\n${'='.repeat(60)}`, 'cyan');
    this.log(`  ${title}`, 'cyan');
    this.log('='.repeat(60), 'cyan');
  }

  // Check for correct Rork SDK imports
  async checkRorkImports() {
    this.logSection('CHECKING RORK SDK IMPORTS');

    const incorrectImport = '@rork/toolkit-sdk';
    const correctImport = '@rork-ai/toolkit-sdk';
    
    try {
      const { globSync } = await import('glob');
      const files = globSync('{app,components,contexts,services,lib,hooks,providers}/**/*.{ts,tsx,js,jsx}', {
        cwd: PROJECT_ROOT,
        ignore: ['**/node_modules/**', '**/.expo/**', '**/dist/**'],
      });

      const matches = [];
      for (const file of files) {
        const fullPath = join(PROJECT_ROOT, file);
        if (!existsSync(fullPath)) continue;
        
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, idx) => {
          if (line.includes(incorrectImport)) {
            matches.push(`${file}:${idx + 1}: ${line.trim()}`);
          }
        });
      }

      if (matches.length > 0) {
        this.log(`✗ Found ${matches.length} incorrect import(s) '${incorrectImport}'`, 'red');
        matches.forEach(match => {
          this.log(`  ${match}`, 'yellow');
        });
        this.issues.push({
          type: 'INCORRECT_IMPORT',
          message: `Use '${correctImport}' instead of '${incorrectImport}'`,
          files: matches,
        });
      } else {
        this.log(`✓ All Rork SDK imports use correct package name`, 'green');
      }
    } catch (error) {
      this.log(`⚠ Could not check imports: ${error.message}`, 'yellow');
    }
  }

  // Verify babel aliases match expected patterns
  async checkBabelAliases() {
    this.logSection('CHECKING BABEL MODULE RESOLVER ALIASES');

    const babelConfigPath = join(PROJECT_ROOT, 'babel.config.js');
    if (!existsSync(babelConfigPath)) {
      this.issues.push({
        type: 'MISSING_CONFIG',
        message: 'babel.config.js not found',
      });
      this.log('✗ babel.config.js not found', 'red');
      return;
    }

    try {
      const content = readFileSync(babelConfigPath, 'utf-8');
      
      // Check for required aliases (look for the key in alias object)
      const requiredAliases = [
        { name: '@', description: 'Project root alias' },
        { name: '@rork-ai/toolkit-sdk', description: 'Rork AI SDK stub' },
      ];

      const missingAliases = [];
      for (const alias of requiredAliases) {
        // More flexible regex that handles quotes and whitespace variations
        const escapedName = alias.name.replace(/[.*+?^${}()|[\]\\@/-]/g, '\\$&');
        const aliasPattern = new RegExp(`['"]${escapedName}['"]\\s*:`);
        if (!aliasPattern.test(content)) {
          missingAliases.push(alias);
        }
      }

      // Check for incorrect alias
      if (content.includes("'@rork/toolkit-sdk':") || content.includes('"@rork/toolkit-sdk":')) {
        this.issues.push({
          type: 'INCORRECT_ALIAS',
          message: "babel.config.js uses '@rork/toolkit-sdk' (should be '@rork-ai/toolkit-sdk')",
          file: 'babel.config.js',
        });
        this.log("✗ Found incorrect alias '@rork/toolkit-sdk' in babel.config.js", 'red');
        this.log("  → Change to '@rork-ai/toolkit-sdk'", 'yellow');
      }

      if (missingAliases.length > 0) {
        this.issues.push({
          type: 'MISSING_ALIAS',
          message: 'Missing required aliases in babel.config.js',
          aliases: missingAliases.map(a => a.name),
        });
        this.log(`✗ Missing ${missingAliases.length} required alias(es) in babel.config.js:`, 'red');
        missingAliases.forEach(alias => {
          this.log(`  - ${alias.name} (${alias.description})`, 'yellow');
        });
      } else if (this.issues.filter(i => i.file === 'babel.config.js').length === 0) {
        this.log('✓ All required babel aliases present and correct', 'green');
      }
    } catch (error) {
      this.issues.push({
        type: 'CONFIG_READ_ERROR',
        message: `Cannot read babel.config.js: ${error.message}`,
      });
      this.log(`✗ Cannot read babel.config.js: ${error.message}`, 'red');
    }
  }

  // Check stub files exist
  async checkStubFiles() {
    this.logSection('CHECKING STUB FILES');

    const stubFiles = [
      { path: 'stubs/rork-toolkit-sdk.ts', name: '@rork-ai/toolkit-sdk stub' },
      { path: 'stubs/rork-ai-toolkit-dev-sdk.ts', name: '@rork-ai/toolkit-dev-sdk stub' },
    ];

    let allPresent = true;
    for (const stub of stubFiles) {
      const fullPath = join(PROJECT_ROOT, stub.path);
      if (!existsSync(fullPath)) {
        this.issues.push({
          type: 'MISSING_STUB',
          message: `Stub file missing: ${stub.path}`,
          file: stub.path,
        });
        this.log(`✗ Missing stub file: ${stub.path}`, 'red');
        allPresent = false;
      }
    }

    if (allPresent) {
      this.log('✓ All required stub files present', 'green');
    }
  }

  // Verify TypeScript path mappings align with babel
  async checkTsConfig() {
    this.logSection('CHECKING TYPESCRIPT PATH MAPPINGS');

    const tsconfigPath = join(PROJECT_ROOT, 'tsconfig.json');
    if (!existsSync(tsconfigPath)) {
      this.warnings.push('tsconfig.json not found');
      this.log('⚠ tsconfig.json not found', 'yellow');
      return;
    }

    try {
      const content = readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(content);
      const paths = tsconfig.compilerOptions?.paths || {};

      // Check for @ alias
      if (!paths['@/*']) {
        this.warnings.push("tsconfig.json missing '@/*' path mapping");
        this.log("⚠ tsconfig.json missing '@/*' path mapping", 'yellow');
      } else {
        this.log("✓ TypeScript '@/*' path mapping present", 'green');
      }
    } catch (error) {
      this.warnings.push(`Cannot parse tsconfig.json: ${error.message}`);
      this.log(`⚠ Cannot parse tsconfig.json: ${error.message}`, 'yellow');
    }
  }

  // Try a quick Metro bundle health check
  async checkMetroHealth() {
    this.logSection('METRO BUNDLER HEALTH CHECK');

    try {
      this.log('Checking if Metro config is valid...', 'cyan');
      const metroConfigPath = join(PROJECT_ROOT, 'metro.config.js');
      
      if (!existsSync(metroConfigPath)) {
        this.log('⚠ metro.config.js not found (using Expo default)', 'yellow');
        return;
      }

      // Just verify it can be read
      try {
        const content = readFileSync(metroConfigPath, 'utf-8');
        if (content.includes('getDefaultConfig') || content.includes('module.exports')) {
          this.log('✓ metro.config.js found and readable', 'green');
          
          // Check if Metro also has the extraNodeModules configured
          if (content.includes('extraNodeModules') && content.includes('@rork-ai/toolkit-sdk')) {
            this.log('✓ Metro has Rork SDK aliases configured', 'green');
          } else {
            this.log('⚠ Metro missing extraNodeModules for Rork SDK', 'yellow');
            this.warnings.push('Metro config should include extraNodeModules for @rork-ai/toolkit-sdk');
          }
        }
      } catch (error) {
        this.issues.push({
          type: 'METRO_CONFIG_ERROR',
          message: `metro.config.js has errors: ${error.message}`,
        });
        this.log(`✗ metro.config.js has errors: ${error.message}`, 'red');
      }
    } catch (error) {
      this.log(`⚠ Could not complete Metro health check: ${error.message}`, 'yellow');
    }
  }

  // Check for common bundling error patterns
  async checkCommonErrors() {
    this.logSection('CHECKING FOR COMMON BUNDLING ERRORS');

    const patterns = [
      {
        pattern: /import\s+.*\s+from\s+['"]@rork\/toolkit-sdk['"]/,
        name: 'Wrong Rork SDK import path',
        fix: "Change '@rork/toolkit-sdk' to '@rork-ai/toolkit-sdk'",
      },
      {
        pattern: /require\(['"]@rork\/toolkit-sdk['"]/,
        name: 'Wrong Rork SDK require path',
        fix: "Change '@rork/toolkit-sdk' to '@rork-ai/toolkit-sdk'",
      },
    ];

    try {
      const { globSync } = await import('glob');
      const files = globSync('{app,components,contexts,services,lib,hooks,providers}/**/*.{ts,tsx,js,jsx}', {
        cwd: PROJECT_ROOT,
        ignore: ['**/node_modules/**', '**/.expo/**', '**/dist/**'],
      });

      let foundIssues = false;
      for (const file of files) {
        const fullPath = join(PROJECT_ROOT, file);
        if (!existsSync(fullPath)) continue;
        
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        for (const { pattern, name, fix } of patterns) {
          lines.forEach((line, idx) => {
            if (pattern.test(line)) {
              this.log(`✗ ${name} in ${file}:${idx + 1}`, 'red');
              this.log(`  ${line.trim()}`, 'yellow');
              this.log(`  Fix: ${fix}`, 'cyan');
              this.issues.push({
                type: 'BUNDLING_ERROR_PATTERN',
                message: `${name} in ${file}:${idx + 1}`,
                file,
                line: idx + 1,
                fix,
              });
              foundIssues = true;
            }
          });
        }
      }

      if (!foundIssues) {
        this.log('✓ No common bundling error patterns found', 'green');
      }
    } catch (error) {
      this.log(`⚠ Could not check for common errors: ${error.message}`, 'yellow');
    }
  }

  // Check for cache issues
  async checkCacheHealth() {
    this.logSection('CHECKING CACHE DIRECTORIES');

    const cacheDirs = [
      { path: '.expo', name: 'Expo cache' },
      { path: 'node_modules/.cache', name: 'Node modules cache' },
      { path: '.cache', name: 'Metro cache' },
    ];

    let hasStaleCache = false;
    for (const dir of cacheDirs) {
      const fullPath = join(PROJECT_ROOT, dir.path);
      if (existsSync(fullPath)) {
        this.log(`⚠ ${dir.name} exists at ${dir.path}`, 'yellow');
        hasStaleCache = true;
      }
    }

    if (hasStaleCache) {
      this.log('\n💡 Consider clearing caches:', 'cyan');
      this.log('   rm -rf .expo .cache node_modules/.cache', 'cyan');
      this.log('   bun x expo start -c', 'cyan');
    } else {
      this.log('✓ No stale cache directories found', 'green');
    }
  }

  // Generate final report
  generateReport() {
    this.logSection('DIAGNOSTIC REPORT');

    const totalIssues = this.issues.length + this.warnings.length;

    if (totalIssues === 0) {
      this.log('✓ No bundling issues detected! Ready to bundle.', 'green');
      return true;
    }

    this.log(`\nTotal Issues: ${totalIssues} (${this.issues.length} errors, ${this.warnings.length} warnings)`, 'yellow');

    if (this.issues.length > 0) {
      this.log('\n❌ ERRORS:', 'red');
      this.issues.forEach((issue, index) => {
        this.log(`  ${index + 1}. [${issue.type}] ${issue.message}`, 'red');
        if (issue.files) {
          issue.files.forEach(file => {
            this.log(`     ${file}`, 'yellow');
          });
        }
        if (issue.file) {
          this.log(`     File: ${issue.file}`, 'yellow');
        }
      });
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠ WARNINGS:', 'yellow');
      this.warnings.forEach((warning, index) => {
        this.log(`  ${index + 1}. ${warning}`, 'yellow');
      });
    }

    this.log('\n💡 QUICK FIXES:', 'cyan');
    
    if (this.issues.some(i => i.type === 'INCORRECT_IMPORT' || i.type === 'BUNDLING_ERROR_PATTERN')) {
      this.log('  # Fix wrong imports:', 'cyan');
      this.log('  find app components contexts services lib -type f \\( -name "*.ts" -o -name "*.tsx" \\) -exec sed -i "s/@rork\\/toolkit-sdk/@rork-ai\\/toolkit-sdk/g" {} +', 'cyan');
    }
    
    this.log('\n  # Clear caches and restart:', 'cyan');
    this.log('  rm -rf .expo .cache node_modules/.cache', 'cyan');
    this.log('  bun x expo start -c', 'cyan');
    
    this.log('\n💡 NEXT STEPS:', 'cyan');
    this.log('1. Apply quick fixes above', 'cyan');
    this.log('2. Run: bun run diagnose (to verify)', 'cyan');
    this.log('3. Try bundling: bun run start', 'cyan');

    return this.issues.length === 0;
  }

  async run() {
    this.log('\n🔬 BUNDLING FAILURE DIAGNOSTICS', 'bold');
    this.log('Checking for common bundling issues...\n', 'cyan');

    await this.checkCommonErrors();
    await this.checkRorkImports();
    await this.checkBabelAliases();
    await this.checkStubFiles();
    await this.checkTsConfig();
    await this.checkMetroHealth();
    await this.checkCacheHealth();

    const success = this.generateReport();

    if (success) {
      this.log('\n✓ All checks passed!', 'green');
      process.exit(0);
    } else {
      this.log('\n✗ Found issues that may cause bundling to fail', 'red');
      this.log('\n🎯 ROOT CAUSE ANALYSIS:', 'bold');
      
      if (this.issues.some(i => i.type === 'INCORRECT_IMPORT' || i.type === 'BUNDLING_ERROR_PATTERN')) {
        this.log('→ Import path mismatch detected', 'red');
        this.log('  The most likely cause is using @rork/toolkit-sdk instead of @rork-ai/toolkit-sdk', 'yellow');
      }
      
      if (this.issues.some(i => i.type === 'MISSING_ALIAS' || i.type === 'INCORRECT_ALIAS')) {
        this.log('→ Babel configuration issue', 'red');
        this.log('  Module resolver aliases are not correctly configured', 'yellow');
      }
      
      if (this.issues.some(i => i.type === 'MISSING_STUB')) {
        this.log('→ Missing stub files', 'red');
        this.log('  Required stub files for Rork SDK are missing', 'yellow');
      }
      
      process.exit(1);
    }
  }
}

// Run diagnostics
const diagnostics = new BundleDiagnostics();
diagnostics.run().catch(error => {
  console.error('Diagnostic failed:', error);
  process.exit(1);
});
