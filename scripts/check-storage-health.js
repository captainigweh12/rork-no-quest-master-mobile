/**
 * Diagnostic Script - Check AsyncStorage Health
 * 
 * Run this to diagnose AsyncStorage corruption issues.
 * 
 * Usage:
 *   node scripts/check-storage-health.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║   AsyncStorage Health Diagnostic Tool         ║');
console.log('╚════════════════════════════════════════════════╝\n');

console.log('This tool helps diagnose SyntaxError issues.\n');

console.log('📋 Diagnostic Steps:\n');
console.log('1. Check device/simulator logs for these patterns:');
console.log('   ❌ [PRE-INIT] 🚨 Storage corruption detected');
console.log('   ❌ [STORAGE] SyntaxError reading key');
console.log('   ❌ SyntaxError: 1:4:\';\' expected\n');

console.log('2. Check for automatic recovery:');
console.log('   ✅ [PRE-INIT] ✅ Nuclear clear successful');
console.log('   ✅ [Emergency Clear] ✅ AsyncStorage.clear() successful\n');

console.log('3. If corruption persists, try these solutions:\n');
console.log('   Solution 1: Pre-Init Auto-Clear');
console.log('   - The app should auto-detect and clear on launch');
console.log('   - Look for [PRE-INIT] logs');
console.log('   - Force-quit and reopen after seeing clear message\n');

console.log('   Solution 2: Manual Emergency Clear');
console.log('   - Navigate to /emergency-clear route');
console.log('   - Tap "EMERGENCY CLEAR NOW"');
console.log('   - Force-quit and reopen\n');

console.log('   Solution 3: Delete & Reinstall');
console.log('   - Delete the app from device');
console.log('   - Reinstall via Expo Go or build');
console.log('   - This clears all app data\n');

console.log('4. Common causes of corruption:\n');
console.log('   • Malformed URLs (e.g., https;:// with semicolon)');
console.log('   • Invalid JSON stored in AsyncStorage');
console.log('   • UTF-16 encoding issues');
console.log('   • App crashes during storage writes\n');

console.log('5. Prevention tips:\n');
console.log('   • Always validate URLs before storing');
console.log('   • Use JSON.stringify() for objects');
console.log('   • Use the typedStorage helpers');
console.log('   • Check for invisible/special characters\n');

console.log('📱 Device-Specific Checks:\n');
console.log('iOS:');
console.log('  - Settings → General → iPhone Storage → [App] → Delete App');
console.log('  - Or swipe up to force quit, then reopen\n');

console.log('Android:');
console.log('  - Settings → Apps → [App] → Storage → Clear Data');
console.log('  - Or Recent Apps → Swipe away → Reopen\n');

console.log('🔍 Where to find logs:\n');
console.log('  - Expo DevTools console');
console.log('  - Terminal where you ran `expo start`');
console.log('  - Device console (Xcode/Android Studio)\n');

console.log('📄 Detailed documentation:');
console.log('  - See ASYNCSTORAGE_CORRUPTION_FIX.md');
console.log('  - See FIX_INSTRUCTIONS.md\n');

rl.question('Would you like to see example log patterns? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    console.log('\n🔴 BAD - Corruption Detected:\n');
    console.log('[PRE-INIT] Testing storage integrity...');
    console.log('[PRE-INIT] Found 15 keys');
    console.log('[PRE-INIT] 🚨 Corrupted key: EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
    console.log('[PRE-INIT] 🚨 Storage corruption detected: Corrupted storage detected at key: EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
    console.log('[PRE-INIT] Performing nuclear clear...');
    console.log('[PRE-INIT] ✅ Nuclear clear successful');
    console.log('\n→ Action: Force-quit app and reopen\n');

    console.log('🟢 GOOD - Everything OK:\n');
    console.log('[PRE-INIT] Testing storage integrity...');
    console.log('[PRE-INIT] Found 12 keys');
    console.log('[PRE-INIT] ✅ Storage integrity check passed');
    console.log('[APP_INIT] Storage ready ✓');
    console.log('[APP_INIT] ✅ Initialization complete - app ready');
    console.log('\n→ Action: None needed\n');

    console.log('🟡 CLEARING - Manual Clear:\n');
    console.log('[Emergency Clear] Starting NUCLEAR clear...');
    console.log('[Emergency Clear] Step 1: Clearing AsyncStorage...');
    console.log('[Emergency Clear] ✅ AsyncStorage.clear() successful');
    console.log('[Emergency Clear] Step 2: Setting Render URL...');
    console.log('[Emergency Clear] ✅ New URL set: https://rork-no-quest-master-mobile.onrender.com');
    console.log('\n→ Action: Close app, swipe away, reopen\n');
  }

  console.log('\n✅ Diagnostic complete!\n');
  rl.close();
});
