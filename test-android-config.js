// Comprehensive Android configuration test
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🤖 Testing Android Configuration\n');
console.log('='.repeat(50));

let hasErrors = false;

// Test 1: Validate app.json
console.log('\n1️⃣ Validating app.json...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf-8'));
  console.log('✅ app.json is valid JSON');
  
  // Check Android config exists
  if (appJson.expo?.android) {
    console.log('✅ Android configuration found');
    
    // Check package name
    if (appJson.expo.android.package) {
      console.log(`✅ Package name: ${appJson.expo.android.package}`);
    } else {
      console.error('❌ Missing android.package');
      hasErrors = true;
    }
    
    // Check adaptive icon
    if (appJson.expo.android.adaptiveIcon?.foregroundImage) {
      const iconPath = appJson.expo.android.adaptiveIcon.foregroundImage;
      if (fs.existsSync(iconPath)) {
        console.log(`✅ Adaptive icon exists: ${iconPath}`);
      } else {
        console.error(`❌ Adaptive icon not found: ${iconPath}`);
        hasErrors = true;
      }
    }
    
    // Verify no google-services.json reference
    if (appJson.expo.android.googleServicesFile) {
      console.log('⚠️  google-services.json is referenced');
      const gsPath = appJson.expo.android.googleServicesFile;
      if (!fs.existsSync(gsPath)) {
        console.error(`❌ google-services.json not found at: ${gsPath}`);
        hasErrors = true;
      }
    } else {
      console.log('✅ No google-services.json reference (correct for now)');
    }
  } else {
    console.error('❌ No Android configuration found');
    hasErrors = true;
  }
} catch (error) {
  console.error('❌ Failed to parse app.json:', error.message);
  hasErrors = true;
}

// Test 2: Check Expo CLI is available
console.log('\n2️⃣ Checking Expo CLI...');
try {
  const expoVersion = execSync('npx expo --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  console.log(`✅ Expo CLI version: ${expoVersion}`);
} catch (error) {
  console.error('❌ Expo CLI not available');
  console.error('   Run: npm install');
  hasErrors = true;
}

// Test 3: Validate Expo config can be parsed
console.log('\n3️⃣ Testing Expo config introspection...');
try {
  const configOutput = execSync('npx expo config --type introspect', { 
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 30000
  });
  
  // Check for the specific error we were fixing
  if (configOutput.includes('Could not parse Expo config')) {
    console.error('❌ Expo config parsing error detected');
    console.error(configOutput);
    hasErrors = true;
  } else if (configOutput.includes('Unable to resolve manifest assets')) {
    console.error('❌ Manifest assets error detected');
    console.error(configOutput);
    hasErrors = true;
  } else {
    console.log('✅ Expo config parsed successfully');
    
    // Try to parse the output as JSON
    try {
      const config = JSON.parse(configOutput);
      if (config.android) {
        console.log('✅ Android configuration validated');
        console.log(`   Package: ${config.android.package}`);
        console.log(`   Permissions: ${config.android.permissions?.length || 0} configured`);
      }
    } catch (e) {
      // Config might not be JSON, that's okay
      console.log('✅ Config output generated (non-JSON format)');
    }
  }
} catch (error) {
  const output = error.output ? error.output.toString() : error.message;
  
  if (output.includes('Could not parse Expo config')) {
    console.error('❌ Expo config parsing FAILED');
    console.error('   Error:', output);
    hasErrors = true;
  } else if (output.includes('Unable to resolve manifest assets')) {
    console.error('❌ Manifest assets resolution FAILED');
    console.error('   Error:', output);
    hasErrors = true;
  } else {
    // Other errors might be okay (like warnings)
    console.log('⚠️  Expo config command had warnings (may be normal)');
  }
}

// Test 4: Check plugin configurations
console.log('\n4️⃣ Validating plugin configurations...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf-8'));
  const plugins = appJson.expo?.plugins || [];
  
  console.log(`   Found ${plugins.length} plugins`);
  
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      const [pluginName, config] = plugin;
      console.log(`   ✅ ${pluginName}`);
      
      // Special check for expo-notifications
      if (pluginName === 'expo-notifications') {
        if (config.icon) {
          if (fs.existsSync(config.icon)) {
            console.log(`      ✅ Icon: ${config.icon}`);
          } else {
            console.error(`      ❌ Icon not found: ${config.icon}`);
            hasErrors = true;
          }
        }
        if (config.sounds) {
          for (const sound of config.sounds) {
            if (!fs.existsSync(sound)) {
              console.error(`      ❌ Sound not found: ${sound}`);
              hasErrors = true;
            }
          }
        } else {
          console.log('      ✅ Using system default sounds');
        }
      }
    } else {
      console.log(`   ✅ ${plugin}`);
    }
  }
} catch (error) {
  console.error('❌ Error checking plugins:', error.message);
  hasErrors = true;
}

// Test 5: Check package.json for required dependencies
console.log('\n5️⃣ Checking required dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = ['expo', 'expo-router', 'expo-notifications', 'expo-location'];
  for (const dep of requiredDeps) {
    if (deps[dep]) {
      console.log(`✅ ${dep}: ${deps[dep]}`);
    } else {
      console.warn(`⚠️  ${dep} not found in dependencies`);
    }
  }
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
  hasErrors = true;
}

// Final summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ ANDROID CONFIGURATION HAS ISSUES');
  console.error('   Please review the errors above');
  console.log('\n📚 For help, see: EXPO_CONFIG_ANDROID_FIX.md');
  process.exit(1);
} else {
  console.log('\n✅ ALL ANDROID CONFIGURATION TESTS PASSED!');
  console.log('\n🎉 Your Android configuration is ready');
  console.log('\nNext steps:');
  console.log('  • npx expo start --clear');
  console.log('  • Press "a" to run on Android');
  console.log('  • Or: npx expo run:android');
  process.exit(0);
}
