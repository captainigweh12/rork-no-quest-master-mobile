/**
 * AsyncStorage Diagnostic Script
 * 
 * Run this script to diagnose AsyncStorage corruption issues.
 * This script can be run from Node.js or included in the app for testing.
 * 
 * Usage (Node.js):
 *   node scripts/diagnose-asyncstorage.js
 * 
 * Usage (in app):
 *   import { diagnoseAsyncStorage } from '@/scripts/diagnose-asyncstorage';
 *   await diagnoseAsyncStorage();
 */

const CORRUPTION_PATTERNS = {
  SEMICOLON_IN_URL: /https?;/,
  CONTROL_CHARS: /[\x00-\x1F]/,
  MALFORMED_JSON: /^[{\[].*$/,
  SEMICOLON_COLON_EXPECTED: /;.*expected|:.*expected/i,
};

/**
 * Detect if a value is corrupted
 */
function detectCorruption(key, value) {
  if (!value) return null;
  
  const issues = [];
  const preview = value.substring(0, 100);
  
  // Check for semicolon in URL
  if ((value.includes('://') || value.startsWith('http')) && CORRUPTION_PATTERNS.SEMICOLON_IN_URL.test(value)) {
    issues.push('SEMICOLON_IN_URL');
  }
  
  // Check for control characters
  if (CORRUPTION_PATTERNS.CONTROL_CHARS.test(preview)) {
    issues.push('CONTROL_CHARS');
  }
  
  // Check for malformed JSON
  if (CORRUPTION_PATTERNS.MALFORMED_JSON.test(value.trim())) {
    try {
      JSON.parse(value);
    } catch (e) {
      issues.push('MALFORMED_JSON');
    }
  }
  
  if (issues.length > 0) {
    return {
      key,
      issues,
      preview: preview.replace(/[\x00-\x1F]/g, '�'),
      length: value.length,
    };
  }
  
  return null;
}

/**
 * Diagnose AsyncStorage for corruption
 */
async function diagnoseAsyncStorage() {
  console.log('🔍 AsyncStorage Diagnostic Tool');
  console.log('================================\n');
  
  try {
    // Import AsyncStorage
    let AsyncStorage;
    try {
      AsyncStorage = require('@react-native-async-storage/async-storage').default;
      console.log('✅ AsyncStorage imported successfully\n');
    } catch (importError) {
      console.error('❌ Failed to import AsyncStorage:', importError.message);
      console.error('   This script must be run from within the React Native app context.\n');
      return { success: false, error: 'IMPORT_FAILED' };
    }
    
    // Get all keys
    console.log('📋 Reading all keys...');
    let keys;
    try {
      keys = await AsyncStorage.getAllKeys();
      console.log(`✅ Found ${keys.length} keys\n`);
    } catch (keysError) {
      console.error('❌ Failed to get keys:', keysError.message);
      if (keysError.message?.includes('SyntaxError')) {
        console.error('🔴 CRITICAL: AsyncStorage metadata is corrupted');
        console.error('   User must manually clear app data from device settings\n');
      }
      return { success: false, error: 'KEYS_FAILED', message: keysError.message };
    }
    
    if (keys.length === 0) {
      console.log('ℹ️  AsyncStorage is empty (no keys found)');
      console.log('   This is normal for a fresh install\n');
      return { success: true, keysCount: 0, corruptedKeys: [] };
    }
    
    // Show all keys
    console.log('📝 Keys in storage:');
    keys.forEach((key, i) => {
      console.log(`   ${i + 1}. ${key}`);
    });
    console.log('');
    
    // Check each key for corruption
    console.log('🔍 Checking for corruption...');
    const corruptedKeys = [];
    const validKeys = [];
    const unreadableKeys = [];
    
    for (const key of keys) {
      try {
        const value = await AsyncStorage.getItem(key);
        const corruption = detectCorruption(key, value);
        
        if (corruption) {
          corruptedKeys.push(corruption);
          console.log(`❌ ${key}:`);
          console.log(`   Issues: ${corruption.issues.join(', ')}`);
          console.log(`   Preview: ${corruption.preview}`);
          console.log('');
        } else {
          validKeys.push(key);
        }
      } catch (readError) {
        unreadableKeys.push({ key, error: readError.message });
        console.log(`🔴 ${key}: UNREADABLE`);
        console.log(`   Error: ${readError.message}`);
        console.log('');
      }
    }
    
    // Summary
    console.log('=====================================');
    console.log('📊 Summary:');
    console.log(`   Total keys: ${keys.length}`);
    console.log(`   ✅ Valid: ${validKeys.length}`);
    console.log(`   ⚠️  Corrupted: ${corruptedKeys.length}`);
    console.log(`   🔴 Unreadable: ${unreadableKeys.length}`);
    console.log('');
    
    // Recommendations
    if (corruptedKeys.length > 0 || unreadableKeys.length > 0) {
      console.log('🔧 Recommendations:');
      console.log('   1. Clear corrupted keys using the emergency clear function');
      console.log('   2. If that fails, manually clear app data from device settings');
      console.log('   3. iOS: Settings → General → iPhone Storage → [App] → Delete App');
      console.log('   4. Android: Settings → Apps → [App] → Storage → Clear Data');
      console.log('');
      
      console.log('💡 To automatically fix:');
      console.log('   Run the emergency clear function from the app:');
      console.log('   import { emergencyClearCorruptedStorage } from "@/lib/emergencyStorageClear";');
      console.log('   await emergencyClearCorruptedStorage();');
      console.log('');
    } else {
      console.log('✅ No corruption detected - AsyncStorage is healthy!');
      console.log('');
    }
    
    return {
      success: true,
      keysCount: keys.length,
      validKeys: validKeys.length,
      corruptedKeys: corruptedKeys.length,
      unreadableKeys: unreadableKeys.length,
      details: {
        corrupted: corruptedKeys,
        unreadable: unreadableKeys,
      },
    };
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error('   Stack:', error.stack);
    console.error('');
    return { success: false, error: 'DIAGNOSTIC_FAILED', message: error.message };
  }
}

// Auto-run if called directly
if (require.main === module) {
  diagnoseAsyncStorage().then((result) => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

module.exports = { diagnoseAsyncStorage, detectCorruption };
