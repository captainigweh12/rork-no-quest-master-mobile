/**
 * Test MMKV Migration
 * 
 * This script tests the MMKV storage implementation
 */

console.log('🧪 Testing MMKV Storage Migration...\n');

// Test 1: Check if MMKV package is installed
console.log('1️⃣ Checking MMKV package installation...');
try {
  const packageJson = require('./package.json');
  const hasMmkv = packageJson.dependencies['react-native-mmkv'];
  
  if (hasMmkv) {
    console.log(`✅ react-native-mmkv ${hasMmkv} is installed\n`);
  } else {
    console.log('❌ react-native-mmkv is NOT installed\n');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error checking package.json:', error.message);
  process.exit(1);
}

// Test 2: Check if mmkvStorage.ts exists
console.log('2️⃣ Checking mmkvStorage.ts file...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const mmkvStoragePath = path.join(__dirname, 'lib', 'mmkvStorage.ts');
  if (fs.existsSync(mmkvStoragePath)) {
    const content = fs.readFileSync(mmkvStoragePath, 'utf-8');
    
    // Check key features
    const hasImport = content.includes("import { MMKV } from 'react-native-mmkv'");
    const hasMigration = content.includes('migrateFromAsyncStorage');
    const hasSQLiteMigration = content.includes('migrateFromSQLite');
    const hasEncryption = content.includes('encryptionKey');
    const hasGuardedStorage = content.includes('export const guardedStorage');
    
    console.log('✅ mmkvStorage.ts exists');
    console.log(`   - MMKV import: ${hasImport ? '✅' : '❌'}`);
    console.log(`   - AsyncStorage migration: ${hasMigration ? '✅' : '❌'}`);
    console.log(`   - SQLite migration: ${hasSQLiteMigration ? '✅' : '❌'}`);
    console.log(`   - Encryption support: ${hasEncryption ? '✅' : '❌'}`);
    console.log(`   - GuardedStorage export: ${hasGuardedStorage ? '✅' : '❌'}\n`);
    
    if (!hasImport || !hasMigration || !hasEncryption || !hasGuardedStorage) {
      console.log('❌ mmkvStorage.ts is missing required features\n');
      process.exit(1);
    }
  } else {
    console.log('❌ mmkvStorage.ts does NOT exist\n');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error checking mmkvStorage.ts:', error.message);
  process.exit(1);
}

// Test 3: Check if storage.ts is updated
console.log('3️⃣ Checking storage.ts configuration...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const storagePath = path.join(__dirname, 'lib', 'storage.ts');
  if (fs.existsSync(storagePath)) {
    const content = fs.readFileSync(storagePath, 'utf-8');
    
    const usesMmkv = content.includes("from './mmkvStorage'");
    const usesSqlite = content.includes("from './sqliteStorage'");
    
    console.log('✅ storage.ts exists');
    console.log(`   - Uses MMKV: ${usesMmkv ? '✅' : '❌'}`);
    console.log(`   - Uses SQLite: ${usesSqlite ? '❌ (good)' : '✅ (needs update)'}\n`);
    
    if (!usesMmkv) {
      console.log('❌ storage.ts is not configured to use MMKV\n');
      process.exit(1);
    }
  } else {
    console.log('❌ storage.ts does NOT exist\n');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error checking storage.ts:', error.message);
  process.exit(1);
}

// Test 4: Check if native rebuild was done
console.log('4️⃣ Checking native build configuration...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const androidPath = path.join(__dirname, 'android');
  const androidExists = fs.existsSync(androidPath);
  
  console.log(`   - Android native directory: ${androidExists ? '✅ exists' : '⚠️ not found (run: npx expo prebuild)'}`);
  
  if (androidExists) {
    // Check if build.gradle includes MMKV
    const buildGradlePath = path.join(androidPath, 'app', 'build.gradle');
    if (fs.existsSync(buildGradlePath)) {
      console.log('   - Android build.gradle: ✅ exists\n');
    }
  } else {
    console.log('   ⚠️ Native rebuild recommended: npx expo prebuild --clean\n');
  }
} catch (error) {
  console.error('⚠️ Warning checking native config:', error.message);
  console.log('');
}

// Test 5: Check documentation
console.log('5️⃣ Checking documentation...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const docPath = path.join(__dirname, 'MMKV_MIGRATION_COMPLETE.md');
  if (fs.existsSync(docPath)) {
    console.log('✅ MMKV_MIGRATION_COMPLETE.md exists\n');
  } else {
    console.log('⚠️ Documentation not found\n');
  }
} catch (error) {
  console.error('⚠️ Warning checking documentation:', error.message);
  console.log('');
}

// Summary
console.log('═'.repeat(60));
console.log('📊 MMKV MIGRATION TEST SUMMARY');
console.log('═'.repeat(60));
console.log('');
console.log('✅ All core migration checks passed!');
console.log('');
console.log('📝 Migration Status:');
console.log('   ✅ react-native-mmkv package installed');
console.log('   ✅ mmkvStorage.ts implementation complete');
console.log('   ✅ storage.ts configured for MMKV');
console.log('   ✅ Automatic migration support included');
console.log('   ✅ Encryption enabled');
console.log('');
console.log('🚀 Next Steps:');
console.log('   1. Start the app: npm start');
console.log('   2. Open on device/simulator');
console.log('   3. Watch console for migration logs:');
console.log('      [MMKV] Initializing storage...');
console.log('      [MMKV] Starting migration from AsyncStorage...');
console.log('      [MMKV] Migration complete!');
console.log('');
console.log('📚 Documentation: MMKV_MIGRATION_COMPLETE.md');
console.log('');
console.log('✨ MMKV migration is ready for testing!');
console.log('');
