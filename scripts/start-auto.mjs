#!/usr/bin/env node
/**
 * START AUTO (Preflight + Auto-Fix + Launch Expo)
 *
 * Steps:
 * 1. Detect encoding issues in babel.config.js and abort with instructions if UTF-16.
 * 2. Ensure module-resolver plugin present; inject or replace if missing.
 * 3. Verify stub files; recreate if missing.
 * 4. Scan for legacy Rork import '@rork/toolkit-sdk' and rewrite to '@rork-ai/toolkit-sdk'.
 * 5. Run diagnostics; if issues remain, attempt force fix then re-run.
 * 6. Launch Expo (native/web/tunnel based on CLI flags).
 *
 * Flags:
 *   --web        Start in web mode
 *   --tunnel     Use tunnel
 *   --force      Proceed even if diagnostics fail
 *   --no-fix     Skip auto mutation steps (diagnose only)
 *   --dry-run    Show actions without applying
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const COLORS = { reset:'\x1b[0m', red:'\x1b[31m', green:'\x1b[32m', yellow:'\x1b[33m', cyan:'\x1b[36m', bold:'\x1b[1m' };
const log = (m,c='reset')=>console.log(`${COLORS[c]}${m}${COLORS.reset}`);

const args = process.argv.slice(2);
const flags = new Set(args.filter(a=>a.startsWith('--')));
const sepIndex = args.indexOf('--');
const passThrough = sepIndex>=0? args.slice(sepIndex+1): [];
const DRY = flags.has('--dry-run') || flags.has('--dry');
const FORCE = flags.has('--force');
const SKIP_FIX = flags.has('--no-fix');
const USE_WEB = flags.has('--web');
const USE_TUNNEL = flags.has('--tunnel');

const ROOT = process.cwd();
const BABEL = join(ROOT,'babel.config.js');
const STUB_MAIN = join(ROOT,'stubs','rork-toolkit-sdk.ts');
const STUB_DEV = join(ROOT,'stubs','rork-ai-toolkit-dev-sdk.ts');

const CANONICAL_BABEL = `// babel.config.js (auto-generated canonical)\nconst makeConfig = function(api){ api&&api.cache&&api.cache(true); const isTest=process.env.JEST_WORKER_ID!==undefined||process.env.NODE_ENV==='test'; const plugins=[['module-resolver',{root:['./'],alias:{'@':'./','@rork-ai/toolkit-sdk':'./stubs/rork-toolkit-sdk','@rork-ai/toolkit-dev-sdk':'./stubs/rork-ai-toolkit-dev-sdk'},extensions:['.ts','.tsx','.js','.jsx','.json']}],'expo-router/babel']; if(!isTest){plugins.push('react-native-reanimated/plugin');} return {presets:['babel-preset-expo','@babel/preset-typescript'],plugins};}; module.exports=makeConfig; module.exports.default=makeConfig;\n`;

function ensureEncoding() {
  if(!existsSync(BABEL)) { log('✗ Missing babel.config.js','red'); return false; }
  const buf = readFileSync(BABEL);
  const isUTF16LE = buf[0]===0xFF && buf[1]===0xFE;
  const isUTF16BE = buf[0]===0xFE && buf[1]===0xFF;
  if (isUTF16LE || isUTF16BE) {
    log('✗ babel.config.js is UTF-16 encoded. Re-save as UTF-8 (no BOM) before auto-fixing.','red');
    log('  VS Code: Status bar → Encoding → Reopen with Encoding → UTF-8 → Save.','yellow');
    return false;
  }
  return true;
}

function ensureModuleResolver() {
  const content = readFileSync(BABEL,'utf8');
  if(/['\"]module-resolver['\"]/.test(content)) { log('• module-resolver already present','yellow'); return true; }
  if(SKIP_FIX){ log('⚠ module-resolver missing (no-fix mode)','yellow'); return false; }
  if(DRY){ log('✓ Would inject module-resolver (dry-run)','green'); return true; }
  const bak = BABEL+`.bak.${Date.now()}`; copyFileSync(BABEL,bak);
  // Try smart injection
  const updated = content.replace(/(plugins\s*:\s*\[\s*)(?=[^\]]*\])/m, `$1['module-resolver',{root:['./'],alias:{'@':'./','@rork-ai/toolkit-sdk':'./stubs/rork-toolkit-sdk','@rork-ai/toolkit-dev-sdk':'./stubs/rork-ai-toolkit-dev-sdk'},extensions:['.ts','.tsx','.js','.jsx','.json']}],`);
  if(updated!==content){ writeFileSync(BABEL,updated,'utf8'); log(`✓ Injected module-resolver (backup ${bak})`,'green'); return true; }
  // Fallback replace with canonical
  writeFileSync(BABEL,CANONICAL_BABEL,'utf8'); log(`✓ Replaced with canonical config (backup ${bak})`,'green'); return true;
}

function ensureStubs(){
  if(!existsSync(STUB_MAIN)){
    if(DRY){ log('✓ Would create main stub (dry-run)','green'); }
    else {
      writeFileSync(STUB_MAIN,"export function rorkSdkInfo(){return 'stub-main';}\n",'utf8');
      log('✓ Created stub: stubs/rork-toolkit-sdk.ts','green');
    }
  }
  if(!existsSync(STUB_DEV)){
    if(DRY){ log('✓ Would create dev stub (dry-run)','green'); }
    else {
      writeFileSync(STUB_DEV,"export function rorkDevSdkInfo(){return 'stub-dev';}\n",'utf8');
      log('✓ Created stub: stubs/rork-ai-toolkit-dev-sdk.ts','green');
    }
  }
}

function rewriteLegacyImports(){
  const patterns = [
    { dir:'app', exts:['ts','tsx','js','jsx'] },
    { dir:'lib', exts:['ts','tsx','js','jsx'] },
    { dir:'contexts', exts:['ts','tsx','js','jsx'] },
  ];
  const legacy = /@rork\/toolkit-sdk/;
  let changed=0, scanned=0;
  for(const p of patterns){
    const { globSync } = require('glob');
    const globPattern = `{${p.dir}}/**/*.{${p.exts.join(',')}}`;
    const files = globSync(globPattern,{ cwd: ROOT, ignore:['**/node_modules/**','**/.expo/**'] });
    for(const file of files){
      const full = join(ROOT,file);
      if(!existsSync(full)) continue;
      scanned++;
      const content = readFileSync(full,'utf8');
      if(legacy.test(content)){
        if(DRY){ log(`✓ Would rewrite legacy import in ${file} (dry-run)`,'green'); continue; }
        const updated = content.replace(legacy,'@rork-ai/toolkit-sdk');
        if(updated!==content){ writeFileSync(full,updated,'utf8'); changed++; }
      }
    }
  }
  if(changed>0) log(`✓ Rewrote ${changed} file(s) with legacy imports`,'green'); else log('• No legacy imports found','yellow');
}

function runDiagnostics(){
  try {
    execSync('node scripts/bundle-diagnostics.mjs',{stdio:'inherit'});
    return true;
  } catch { return false; }
}

function startExpo(){
  let script = 'start';
  if(USE_WEB && USE_TUNNEL) script = 'start-web:tunnel';
  else if(USE_WEB) script = 'start-web';
  else if(USE_TUNNEL) script = 'start:tunnel';
  const extra = passThrough.length? ' -- '+passThrough.join(' '): '';
  const cmd = `bun run ${script}${extra}`;
  log(`\n🚀 Launching Expo via ${script}`,'cyan');
  execSync(cmd,{stdio:'inherit'});
}

function main(){
  log('\n⚙️  Preflight auto-fix starting','bold');
  if(!ensureEncoding()){ if(!FORCE){ process.exit(1); } else { log('⚠ Continuing despite encoding issue due to --force','yellow'); } }
  ensureStubs();
  if(!SKIP_FIX) ensureModuleResolver();
  if(!SKIP_FIX) rewriteLegacyImports();

  log('\n🔍 Running diagnostics (pass 1)','cyan');
  const ok1 = runDiagnostics();
  if(!ok1 && !SKIP_FIX && !FORCE){
    log('\n🔧 Attempting force canonical babel replacement','yellow');
    writeFileSync(BABEL,CANONICAL_BABEL,'utf8');
    log('✓ Applied canonical babel.config.js','green');
    log('\n🔍 Running diagnostics (pass 2)','cyan');
    const ok2 = runDiagnostics();
    if(!ok2){
      log('✗ Diagnostics still failing. Use --force to start anyway or fix manually.','red');
      process.exit(1);
    }
  }
  if(!ok1 && FORCE){ log('⚠ Diagnostics failing, proceeding due to --force','yellow'); }

  startExpo();
}

main();
