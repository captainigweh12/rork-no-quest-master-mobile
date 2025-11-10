#!/usr/bin/env node

/**
 * RORK BUNDLING AUDIT SYSTEM
 * 
 * Comprehensive bundling error detection and prevention system
 * Catches bundling issues before they happen and provides detailed diagnostics
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = process.cwd();
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

class BundlingAuditor {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.issues = {
      syntaxErrors: [],
      missingDependencies: [],
      circularDependencies: [],
      incompatibleVersions: [],
      nativeModuleIssues: [],
      configurationIssues: [],
      importIssues: [],
      encodingIssues: [],
    };
    this.checkedFiles = new Set();
    this.moduleCache = new Map();
    this.tsPassed = false;
  }

  log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  }

  logSection(title) {
    this.log(`\n${'='.repeat(60)}`, 'cyan');
    this.log(`  ${title}`, 'cyan');
    this.log('='.repeat(60), 'cyan');
  }

  addError(category, message, file = null, details = null) {
    const error = { message, file, details, timestamp: new Date() };
    this.errors.push(error);
    if (this.issues[category]) {
      this.issues[category].push(error);
    }
  }

  addWarning(message, file = null) {
    this.warnings.push({ message, file, timestamp: new Date() });
  }

  // 1. Check all TypeScript/JavaScript files for syntax errors
  async checkSyntaxErrors() {
    this.logSection('CHECKING SYNTAX ERRORS');
    
    const files = this.getAllSourceFiles();
    let checkedCount = 0;
    let errorCount = 0;

    for (const file of files) {
      if (this.checkedFiles.has(file)) continue;
      this.checkedFiles.add(file);
      
      try {
        const content = readFileSync(file, 'utf-8');
        
        // Check for BOM
        if (content.charCodeAt(0) === 0xFEFF) {
          this.addWarning('File has BOM (Byte Order Mark)', file);
        }

  // Check for common syntax issues (limit to client-relevant app code)
  const relPath = relative(PROJECT_ROOT, file).replace(/\\/g, '/');
  const isClientRelevant = /^(app|lib|contexts)\//.test(relPath);
  this.checkCommonSyntaxIssues(content, file, isClientRelevant);
        
        checkedCount++;
      } catch (error) {
        this.addError('syntaxErrors', `Cannot read file: ${error.message}`, file);
        errorCount++;
      }
    }

    this.log(`✓ Checked ${checkedCount} files`, errorCount > 0 ? 'yellow' : 'green');
    if (errorCount > 0) {
      this.log(`✗ Found ${errorCount} syntax errors`, 'red');
    }
  }

  checkCommonSyntaxIssues(content, file, isClientRelevant = true) {
    const lines = content.split('\n');
    const disableHeuristics = process.env.AUDIT_DISABLE_HEURISTICS === '1';
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for incomplete code blocks
      if (line.trim().endsWith('{') && !lines[index + 1]) {
        this.addError('syntaxErrors', `Incomplete code block at line ${lineNum}`, file);
      }

      // Check for mismatched quotes (skip if heuristics disabled)
      if (!disableHeuristics) {
        const singleQuotes = (line.match(/'/g) || []).length;
        const doubleQuotes = (line.match(/"/g) || []).length;
        const backticks = (line.match(/`/g) || []).length;
        
        if (singleQuotes % 2 !== 0 && !line.includes('//')) {
          this.addWarning(`Possible unmatched single quote at line ${lineNum}`, file);
        }
      }

      // Check for common React Native incompatibilities (skip if heuristics disabled)
      if (!disableHeuristics) {
        if ((line.includes('document.') || line.includes('window.')) && !line.includes('//')) {
          if (!file.includes('web') && !file.includes('.web.')) {
            this.addWarning(`Browser API usage detected at line ${lineNum} (not web-specific file)`, file);
          }
        }
      }

      // Check for Node.js-only APIs in client code
      if (isClientRelevant) {
        if (/\bfs\b\./.test(line) || /require\(['"]fs['"]\)/.test(line)) {
          this.addError('importIssues', `Node.js 'fs' module used in client code at line ${lineNum}`, file);
        }
      }
    });

    // Check for missing closing braces/brackets (skip if heuristics disabled)
    if (!disableHeuristics) {
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      const openBrackets = (content.match(/\[/g) || []).length;
      const closeBrackets = (content.match(/\]/g) || []).length;
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;

      if (isClientRelevant && openBraces !== closeBraces) {
        this.addError('syntaxErrors', `Mismatched braces: ${openBraces} open, ${closeBraces} close`, file, { heuristic: true });
      }
      if (isClientRelevant && openBrackets !== closeBrackets) {
        this.addError('syntaxErrors', `Mismatched brackets: ${openBrackets} open, ${closeBrackets} close`, file, { heuristic: true });
      }
      if (isClientRelevant && openParens !== closeParens) {
        this.addError('syntaxErrors', `Mismatched parentheses: ${openParens} open, ${closeParens} close`, file, { heuristic: true });
      }
    }
  }

  // 2. Check for missing dependencies
  async checkDependencies() {
    this.logSection('CHECKING DEPENDENCIES');
    
    try {
      const packageJson = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const files = this.getAllSourceFiles();
      const importedModules = new Set();

      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8');
          const importRegex = /(?:import\s+[^'"\n]+from\s+|import\(|require\()\s*['"]([^'"\)]+)['"]\)?/g;
          let m;
          while ((m = importRegex.exec(content)) !== null) {
            const mod = m[1];
            if (!mod || /\s/.test(mod)) continue; // skip malformed
            if (mod.startsWith('.') || mod.startsWith('@/')) continue; // local
            // Base module extraction
            const baseModule = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
            importedModules.add(baseModule);
          }
        } catch (error) {
          this.addWarning(`Could not check imports in ${file}: ${error.message}`);
        }
      }

      const devOnlyWhitelist = new Set([
        'metro', 'metro-cache', 'node:fs', 'node:path', 'node:net', 'node:http', 'node:https', 'node:os', 'node:child_process'
      ]);

      let missingCount = 0;
      for (const module of importedModules) {
        if (devOnlyWhitelist.has(module)) continue;
        if (!allDeps[module] && !this.isBuiltInModule(module)) {
          this.addError('missingDependencies', `Module '${module}' is imported but not in package.json`, null);
          missingCount++;
        }
      }

      if (missingCount === 0) {
        this.log('✓ All imported modules are declared in package.json', 'green');
      } else {
        this.log(`✗ Found ${missingCount} missing dependencies`, 'red');
      }
    } catch (error) {
      this.addError('configurationIssues', `Could not check dependencies: ${error.message}`);
    }
  }

  isBuiltInModule(module) {
    const builtIns = new Set([
      'react', 'react-native', 'expo', 'expo-router',
      'buffer', 'events', 'stream', 'util', 'crypto',
      'fs', 'path', 'http', 'https', 'child_process', 'net', 'os', 'zlib', 'node:util',
      'expo-sqlite', 'expo-updates', 'expo-file-system'
    ]);
    const externals = new Set([
      '@rork-ai/toolkit-sdk', '@rork-ai/toolkit-dev-sdk',
      '@daily-co/react-native-daily-js', 'standardwebhooks', 'npm:standardwebhooks@1.0.0', 'ai', '@expo/config'
    ]);
    return builtIns.has(module) || externals.has(module);
  }

  // 3. Check for circular dependencies
  async checkCircularDependencies() {
    this.logSection('CHECKING CIRCULAR DEPENDENCIES');
    
    const dependencyGraph = new Map();
    const files = this.getAllSourceFiles();

    // Build dependency graph
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const imports = this.extractImports(content, file);
        dependencyGraph.set(file, imports);
      } catch (error) {
        this.addWarning(`Could not analyze dependencies for ${file}`);
      }
    }

    // Detect cycles
    const visited = new Set();
    const recursionStack = new Set();
    let cyclesFound = 0;

    const detectCycle = (file, path = []) => {
      if (recursionStack.has(file)) {
        const cycle = [...path, file];
        const cycleStart = cycle.indexOf(file);
        const cyclePath = cycle.slice(cycleStart).map(f => relative(PROJECT_ROOT, f));
        this.addError('circularDependencies', `Circular dependency detected`, null, {
          cycle: cyclePath.join(' → ')
        });
        cyclesFound++;
        return;
      }

      if (visited.has(file)) return;

      visited.add(file);
      recursionStack.add(file);

      const deps = dependencyGraph.get(file) || [];
      for (const dep of deps) {
        detectCycle(dep, [...path, file]);
      }

      recursionStack.delete(file);
    };

    for (const file of dependencyGraph.keys()) {
      detectCycle(file);
    }

    if (cyclesFound === 0) {
      this.log('✓ No circular dependencies detected', 'green');
    } else {
      this.log(`✗ Found ${cyclesFound} circular dependencies`, 'red');
    }
  }

  extractImports(content, currentFile) {
    const imports = [];
    const importRegex = /(?:import\s+[^'"\n]+from\s+|import\(|require\()\s*['"]([^'"\)]+)['"]\)?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (!importPath || /\s/.test(importPath)) continue; // skip malformed
      if (importPath.startsWith('.') || importPath.startsWith('@/')) {
        const resolvedPath = this.resolveImportPath(importPath, currentFile);
        if (resolvedPath) imports.push(resolvedPath);
      }
    }
    return imports;
  }

  resolveImportPath(importPath, fromFile) {
    const dir = join(fromFile, '..');
  const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    
    for (const ext of possibleExtensions) {
      const aliasPath = importPath.startsWith('@/') ? join(PROJECT_ROOT, importPath.slice(2)) : importPath;
      const fullPath = join(dir, aliasPath + ext);
      if (existsSync(fullPath)) {
        return fullPath;
      }
      
      // Check for index files
      const indexPath = join(dir, aliasPath, 'index' + ext);
      if (existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    return null;
  }

  // 4. Check React Native and Expo compatibility
  async checkCompatibility() {
    this.logSection('CHECKING REACT NATIVE & EXPO COMPATIBILITY');
    
    try {
      const packageJson = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      
      // Check Expo version compatibility
      const expoVersion = packageJson.dependencies?.expo || packageJson.devDependencies?.expo;
      const reactNativeVersion = packageJson.dependencies?.['react-native'];
      
      this.log(`Expo version: ${expoVersion}`, 'cyan');
      this.log(`React Native version: ${reactNativeVersion}`, 'cyan');

      // Check for incompatible packages
      const incompatibleWithExpoGo = [
        'react-native-mmkv',
        '@shopify/react-native-skia',
        'react-native-screens',
      ];

      const ignoreDevClientWarnings = process.env.AUDIT_IGNORE_DEV_CLIENT_WARNINGS === '1';
      if (!ignoreDevClientWarnings) {
        for (const pkg of incompatibleWithExpoGo) {
          if (packageJson.dependencies?.[pkg]) {
            this.addWarning(`Package '${pkg}' requires a custom dev client (not compatible with Expo Go)`);
          }
        }
      } else {
        this.log('⚙ Dev client compatibility warnings suppressed (clean mode)', 'yellow');
      }

      this.log('✓ Version compatibility check complete', 'green');
    } catch (error) {
      this.addError('configurationIssues', `Could not check compatibility: ${error.message}`);
    }
  }

  // 5. Check configuration files
  async checkConfigurations() {
    this.logSection('CHECKING CONFIGURATION FILES');
    
    const configFiles = [
      'babel.config.js',
      'metro.config.js',
      'app.config.ts',
      'tsconfig.json',
    ];

    for (const configFile of configFiles) {
      const path = join(PROJECT_ROOT, configFile);
      if (existsSync(path)) {
        try {
          const content = readFileSync(path, 'utf-8');
          this.log(`✓ ${configFile} found and readable`, 'green');
          
          // Specific checks for each config
          if (configFile === 'babel.config.js') {
            if (!content.includes('expo-router/babel')) {
              this.addWarning('babel.config.js may be missing expo-router/babel plugin');
            }
            if (!content.includes("'module-resolver'")) {
              this.addWarning('babel.config.js may be missing module-resolver for path aliases');
            }
          }
          
          if (configFile === 'metro.config.js') {
            if (!content.includes('getDefaultConfig')) {
              this.addWarning('metro.config.js may not be using Expo default config');
            }
          }
        } catch (error) {
          this.addError('configurationIssues', `Cannot read ${configFile}: ${error.message}`);
        }
      } else {
        this.addError('configurationIssues', `Required config file missing: ${configFile}`);
      }
    }
  }

  // 6. Check for encoding issues
  async checkEncodingIssues() {
    this.logSection('CHECKING FILE ENCODING');
    
    const files = this.getAllSourceFiles();
    let bomCount = 0;
    let encodingIssues = 0;

    for (const file of files) {
      try {
        const buffer = readFileSync(file);
        const content = buffer.toString('utf-8');
        
        // Check for BOM
        if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
          this.addError('encodingIssues', 'File has UTF-8 BOM', file);
          bomCount++;
        }
        
        // Check for null bytes (binary files mistakenly included)
        if (content.includes('\0')) {
          this.addError('encodingIssues', 'File contains null bytes (possibly binary)', file);
          encodingIssues++;
        }
      } catch (error) {
        this.addWarning(`Could not check encoding for ${file}`);
      }
    }

    if (bomCount === 0 && encodingIssues === 0) {
      this.log('✓ No encoding issues detected', 'green');
    } else {
      this.log(`✗ Found ${bomCount + encodingIssues} encoding issues`, 'red');
    }
  }

  // 7. Attempt to detect bundling errors
  async testBundling() {
    this.logSection('TESTING BUNDLING');
    
    try {
      this.log('Attempting to validate TypeScript compilation...', 'cyan');
      
      try {
        execSync('npx tsc --noEmit', {
          cwd: PROJECT_ROOT,
          stdio: 'pipe',
          timeout: 30000,
        });
        this.tsPassed = true;
        this.log('✓ TypeScript compilation check passed', 'green');
      } catch (error) {
        const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
        this.addError('syntaxErrors', 'TypeScript compilation errors detected', null, {
          output
        });
        this.log('✗ TypeScript compilation check failed', 'red');
      }
    } catch (error) {
      this.addWarning('Could not run TypeScript validation');
    }
  }

  // 8. Check code invariants
  async checkInvariants() {
    this.logSection('CHECKING CODE INVARIANTS');
    
    if (process.env.AUDIT_DISABLE_INVARIANTS === '1') {
      this.log('⚙ Invariant checks skipped (clean mode)', 'yellow');
      return; // Skip invariant scanning entirely in clean mode
    }

    const files = this.getAllSourceFiles();
    let tsNocheckCount = 0;
    
    for (const file of files) {
      const relPath = relative(PROJECT_ROOT, file).replace(/\\/g, '/');
      
      // Skip checking in tests, scripts, and backend
      if (/(tests?|scripts|backend)\//.test(relPath)) continue;
      
      try {
        const content = readFileSync(file, 'utf-8');
        
        // Check for @ts-nocheck in app/lib/contexts
        if (/^(app|lib|contexts)\//.test(relPath)) {
          if (content.includes('@ts-nocheck')) {
            this.addWarning(`@ts-nocheck found in production code`, file);
            tsNocheckCount++;
          }
        }
        
        // Check storage files have required exports
        if (relPath.includes('storage') && relPath.includes('lib/')) {
          if (!content.includes('export') && !content.includes('export default')) {
            this.addWarning('Storage file missing exports', file);
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    if (tsNocheckCount === 0) {
      this.log('✓ No @ts-nocheck in production code', 'green');
    } else {
      this.log(`⚠ Found ${tsNocheckCount} files with @ts-nocheck`, 'yellow');
    }
  }

  getAllSourceFiles(dir = PROJECT_ROOT, files = []) {
    const excludeDirs = ['node_modules', '.expo', '.git', 'build', 'dist', 'android', 'ios'];
    const includeExts = ['.ts', '.tsx', '.js', '.jsx'];

    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(entry)) {
            this.getAllSourceFiles(fullPath, files);
          }
        } else if (stat.isFile()) {
          const ext = extname(entry);
          if (includeExts.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return files;
  }

  // Generate comprehensive report
  generateReport() {
    this.logSection('BUNDLING AUDIT REPORT');
    
    // If TS passed, downgrade heuristic syntax mismatches to warnings
    if (this.tsPassed && Array.isArray(this.issues.syntaxErrors)) {
      const remaining = [];
      for (const err of this.issues.syntaxErrors) {
        if (err?.details && err.details.heuristic) {
          this.warnings.push({ message: `Heuristic: ${err.message}`, file: err.file, timestamp: new Date() });
        } else {
          remaining.push(err);
        }
      }
      const removed = this.issues.syntaxErrors.length - remaining.length;
      if (removed > 0) {
        this.issues.syntaxErrors = remaining;
        this.errors = this.errors.filter(e => !(e?.details && e.details.heuristic));
      }
    }

    const totalIssues = this.errors.length + this.warnings.length;
    
    if (totalIssues === 0) {
      this.log('✓ No issues detected! Bundle should build successfully.', 'green');
      return true;
    }

    // Display errors by category
    this.log(`\nTotal Issues: ${totalIssues} (${this.errors.length} errors, ${this.warnings.length} warnings)`, 'yellow');

    for (const [category, issues] of Object.entries(this.issues)) {
      if (issues.length > 0) {
        this.log(`\n${category.toUpperCase()}:`, 'red');
        issues.forEach((issue, index) => {
          this.log(`  ${index + 1}. ${issue.message}`, 'red');
          if (issue.file) {
            this.log(`     File: ${relative(PROJECT_ROOT, issue.file)}`, 'yellow');
          }
          if (issue.details) {
            if (typeof issue.details === 'object' && !Array.isArray(issue.details)) {
              for (const [key, value] of Object.entries(issue.details)) {
                this.log(`     ${key}: ${value}`, 'yellow');
              }
            } else {
              this.log(`     Details: ${JSON.stringify(issue.details, null, 2)}`, 'yellow');
            }
          }
        });
      }
    }

    if (this.warnings.length > 0) {
      this.log('\nWARNINGS:', 'yellow');
      this.warnings.forEach((warning, index) => {
        this.log(`  ${index + 1}. ${warning.message}`, 'yellow');
        if (warning.file) {
          this.log(`     File: ${relative(PROJECT_ROOT, warning.file)}`, 'cyan');
        }
      });
    }

    // Recommendations
    this.log('\nRECOMMENDATIONS:', 'cyan');
    this.log('1. Fix all syntax errors before attempting to bundle', 'cyan');
    this.log('2. Install any missing dependencies', 'cyan');
    this.log('3. Resolve circular dependencies', 'cyan');
    this.log('4. Remove BOM from files with encoding issues', 'cyan');
    this.log('5. Clear Metro bundler cache: npm run start -- --reset-cache', 'cyan');

    return this.errors.length === 0;
  }

  async run() {
    const jsonOutput = process.argv.includes('--json');
    const jsonFile = process.argv.find(arg => arg.startsWith('--json='))?.split('=')[1] || 'audit-report.json';
    const cleanMode = process.argv.includes('--clean');
    const noInvariantsFlag = process.argv.includes('--no-invariants');
    const ignoreDevFlag = process.argv.includes('--ignore-dev');
    const disableHeuristicsFlag = process.argv.includes('--no-heuristics');
    
    if (!jsonOutput) {
      this.log('\n🔍 RORK BUNDLING AUDIT SYSTEM', 'bold');
      this.log('Starting comprehensive bundling audit...\n', 'cyan');
    }

    // Apply clean mode environment overrides BEFORE running checks
    if (cleanMode) {
      process.env.AUDIT_DISABLE_HEURISTICS = '1';
      process.env.AUDIT_DISABLE_INVARIANTS = '1';
      process.env.AUDIT_IGNORE_DEV_CLIENT_WARNINGS = '1';
      if (!jsonOutput) this.log('🧹 Clean mode enabled: heuristics, invariants, dev-client warnings suppressed', 'yellow');
    } else {
      // Granular flags (can be combined)
      if (noInvariantsFlag) process.env.AUDIT_DISABLE_INVARIANTS = '1';
      if (ignoreDevFlag) process.env.AUDIT_IGNORE_DEV_CLIENT_WARNINGS = '1';
      if (disableHeuristicsFlag) process.env.AUDIT_DISABLE_HEURISTICS = '1';
      if (!jsonOutput && (noInvariantsFlag || ignoreDevFlag || disableHeuristicsFlag)) {
        const active = [
          noInvariantsFlag && 'no-invariants',
          ignoreDevFlag && 'ignore-dev',
          disableHeuristicsFlag && 'no-heuristics'
        ].filter(Boolean).join(', ');
        this.log(`⚙ Granular suppression active: ${active}`, 'yellow');
      }
    }
    
    const failOnWarnings = process.env.FAIL_ON_WARNINGS === '1';
    const strictMode = process.argv.includes('--strict');

    await this.checkSyntaxErrors();
    await this.checkDependencies();
    await this.checkCircularDependencies();
    await this.checkCompatibility();
    await this.checkConfigurations();
    await this.checkEncodingIssues();
    await this.testBundling();
    await this.checkInvariants();

    const success = this.generateReport();
    
    // Output JSON if requested
    if (jsonOutput) {
      this.generateJSONReport(jsonFile);
    }
    
    if (success && (!failOnWarnings || this.warnings.length === 0)) {
      if (!jsonOutput) this.log('\n✓ Audit completed successfully!', 'green');
      process.exit(0);
    } else if (success && (failOnWarnings || strictMode) && this.warnings.length > 0) {
      if (!jsonOutput) this.log('\n⚠ Audit passed but warnings escalated to failure (strict mode)', 'yellow');
      process.exit(2);
    } else {
      if (!jsonOutput) this.log('\n✗ Audit found issues that need attention', 'red');
      process.exit(1);
    }
  }

  generateJSONReport(outputFile) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.errors.length + this.warnings.length,
        errors: this.errors.length,
        warnings: this.warnings.length,
        typeScriptPassed: this.tsPassed,
      },
      issues: this.issues,
      errors: this.errors,
      warnings: this.warnings,
    };
    
    try {
      writeFileSync(outputFile, JSON.stringify(report, null, 2));
      console.log(`JSON report written to ${outputFile}`);
    } catch (error) {
      console.error('Failed to write JSON report:', error.message);
    }
  }
}

// Run the auditor
const auditor = new BundlingAuditor();
auditor.run().catch(error => {
  console.error('Auditor failed:', error);
  process.exit(1);
});
