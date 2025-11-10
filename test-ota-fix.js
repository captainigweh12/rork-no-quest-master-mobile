/**
 * Test script to verify OTA and build error fixes
 * Tests configuration changes and validates the fix
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing OTA Fix Implementation\n');
console.log('='.repeat(60));

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

// Test 1: Verify GitHub Actions workflow has OTA disabled
test('GitHub Actions workflow has OTA job commented out', () => {
  const workflowPath = path.join(__dirname, '.github/workflows/eas-build.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');
  
  if (!content.includes('# OTA updates disabled')) {
    throw new Error('OTA disable comment not found');
  }
  
  if (!content.includes('# update:')) {
    throw new Error('Update job not commented out');
  }
  
  // Verify the job is actually commented
  const lines = content.split('\n');
  let inUpdateJob = false;
  let allCommented = true;
  
  for (const line of lines) {
    if (line.trim().startsWith('# update:')) {
      inUpdateJob = true;
    }
    if (inUpdateJob && line.trim() && !line.trim().startsWith('#')) {
      if (line.includes('build:') || line.includes('preview:')) {
        inUpdateJob = false;
      } else {
        allCommented = false;
        break;
      }
    }
  }
  
  if (!allCommented) {
    throw new Error('Update job not fully commented out');
  }
});

// Test 2: Verify app.config.ts has OTA disabled
test('app.config.ts has OTA_ENABLED set to false', () => {
  const configPath = path.join(__dirname, 'app.config.ts');
  const content = fs.readFileSync(configPath, 'utf8');
  
  if (!content.includes('const OTA_ENABLED = false')) {
    throw new Error('OTA_ENABLED not set to false');
  }
  
  if (!content.includes('OTA updates completely disabled')) {
    throw new Error('OTA disable comment not found');
  }
});

// Test 3: Verify updates configuration is disabled
test('app.config.ts updates configuration is disabled', () => {
  const configPath = path.join(__dirname, 'app.config.ts');
  const content = fs.readFileSync(configPath, 'utf8');
  
  if (!content.includes('enabled: false')) {
    throw new Error('Updates not disabled in config');
  }
  
  if (!content.includes("checkOnLaunch: 'NEVER'")) {
    throw new Error('checkOnLaunch not set to NEVER');
  }
  
  if (!content.includes('fallbackToCacheTimeout: 0')) {
    throw new Error('fallbackToCacheTimeout not set to 0');
  }
});

// Test 4: Verify no conditional OTA logic remains
test('app.config.ts has no conditional OTA logic', () => {
  const configPath = path.join(__dirname, 'app.config.ts');
  const content = fs.readFileSync(configPath, 'utf8');
  
  // Should not have ternary operator for updates
  if (content.includes('updates: (OTA_ENABLED')) {
    throw new Error('Conditional OTA logic still present');
  }
  
  if (content.includes('? {') && content.includes('enabled: true')) {
    throw new Error('Conditional updates configuration still present');
  }
});

// Test 5: Verify build jobs are still present
test('GitHub Actions workflow has build jobs intact', () => {
  const workflowPath = path.join(__dirname, '.github/workflows/eas-build.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');
  
  if (!content.includes('build:')) {
    throw new Error('Build job not found');
  }
  
  if (!content.includes('preview:')) {
    throw new Error('Preview job not found');
  }
  
  if (!content.includes('Build Custom Dev Client')) {
    throw new Error('Build job name not found');
  }
  
  if (!content.includes('Build Preview Builds')) {
    throw new Error('Preview job name not found');
  }
});

// Test 6: Verify EAS configuration is valid
test('eas.json has valid configuration', () => {
  const easPath = path.join(__dirname, 'eas.json');
  const content = fs.readFileSync(easPath, 'utf8');
  const config = JSON.parse(content);
  
  if (!config.build) {
    throw new Error('Build configuration not found');
  }
  
  if (!config.build.development) {
    throw new Error('Development build profile not found');
  }
  
  if (!config.build.preview) {
    throw new Error('Preview build profile not found');
  }
  
  if (!config.update) {
    throw new Error('Update configuration not found');
  }
});

// Test 7: Verify app.config.ts is valid TypeScript
test('app.config.ts has valid syntax', () => {
  const configPath = path.join(__dirname, 'app.config.ts');
  const content = fs.readFileSync(configPath, 'utf8');
  
  // Check for basic syntax issues
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    throw new Error('Mismatched braces in config');
  }
  
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    throw new Error('Mismatched parentheses in config');
  }
  
  if (!content.includes('export default')) {
    throw new Error('No default export found');
  }
});

// Test 8: Verify package.json has required scripts
test('package.json has required scripts', () => {
  const packagePath = path.join(__dirname, 'package.json');
  const content = fs.readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(content);
  
  if (!pkg.scripts) {
    throw new Error('Scripts not found in package.json');
  }
  
  if (!pkg.scripts.start && !pkg.scripts.dev) {
    throw new Error('Start/dev script not found');
  }
});

// Test 9: Verify metro.config.js exists and is valid
test('metro.config.js is valid', () => {
  const metroPath = path.join(__dirname, 'metro.config.js');
  
  if (!fs.existsSync(metroPath)) {
    throw new Error('metro.config.js not found');
  }
  
  const content = fs.readFileSync(metroPath, 'utf8');
  
  if (!content.includes('module.exports')) {
    throw new Error('No module.exports found in metro.config.js');
  }
});

// Test 10: Verify documentation files exist
test('Documentation files created', () => {
  const planPath = path.join(__dirname, 'OTA_BUILD_ERROR_FIX_PLAN.md');
  const completePath = path.join(__dirname, 'OTA_BUILD_ERROR_FIX_COMPLETE.md');
  
  if (!fs.existsSync(planPath)) {
    throw new Error('OTA_BUILD_ERROR_FIX_PLAN.md not found');
  }
  
  if (!fs.existsSync(completePath)) {
    throw new Error('OTA_BUILD_ERROR_FIX_COMPLETE.md not found');
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Results:`);
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);
console.log(`   📈 Total:  ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed! OTA fix is properly implemented.');
  console.log('\n📝 Next Steps:');
  console.log('   1. Test locally: npm run dev');
  console.log('   2. Push changes to GitHub');
  console.log('   3. Verify GitHub Actions workflow runs without OTA job');
  console.log('   4. Test app loading without bundling errors');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}
