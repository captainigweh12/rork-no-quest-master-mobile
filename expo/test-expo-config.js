// Test script to verify Expo configuration
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Expo Configuration...\n');

// Read app.json
const appJsonPath = path.join(__dirname, 'app.json');
let appJson;

try {
  const appJsonContent = fs.readFileSync(appJsonPath, 'utf-8');
  appJson = JSON.parse(appJsonContent);
  console.log('✅ app.json is valid JSON');
} catch (error) {
  console.error('❌ Failed to parse app.json:', error.message);
  process.exit(1);
}

// Check for issues
let hasIssues = false;

// 1. Check for google-services.json reference
if (appJson.expo?.android?.googleServicesFile) {
  const googleServicesPath = path.join(__dirname, appJson.expo.android.googleServicesFile);
  if (!fs.existsSync(googleServicesPath)) {
    console.error(`❌ google-services.json referenced but not found at: ${appJson.expo.android.googleServicesFile}`);
    hasIssues = true;
  } else {
    console.log('✅ google-services.json file exists');
  }
} else {
  console.log('✅ No google-services.json reference (optional, only needed for Firebase)');
}

// 2. Check notification plugin assets
const plugins = appJson.expo?.plugins || [];
for (const plugin of plugins) {
  if (Array.isArray(plugin) && plugin[0] === 'expo-notifications') {
    const config = plugin[1];
    
    // Check icon
    if (config.icon) {
      const iconPath = path.join(__dirname, config.icon);
      if (!fs.existsSync(iconPath)) {
        console.error(`❌ Notification icon not found at: ${config.icon}`);
        hasIssues = true;
      } else {
        console.log(`✅ Notification icon exists: ${config.icon}`);
      }
    }
    
    // Check sounds
    if (config.sounds && Array.isArray(config.sounds)) {
      for (const sound of config.sounds) {
        const soundPath = path.join(__dirname, sound);
        if (!fs.existsSync(soundPath)) {
          console.error(`❌ Notification sound not found at: ${sound}`);
          hasIssues = true;
        } else {
          console.log(`✅ Notification sound exists: ${sound}`);
        }
      }
    } else {
      console.log('✅ No custom notification sounds (will use system defaults)');
    }
  }
}

// 3. Check other required assets
const assetsToCheck = [
  appJson.expo?.icon,
  appJson.expo?.splash?.image,
  appJson.expo?.android?.adaptiveIcon?.foregroundImage,
  appJson.expo?.web?.favicon
].filter(Boolean);

console.log('\n📁 Checking required assets:');
for (const asset of assetsToCheck) {
  const assetPath = path.join(__dirname, asset);
  if (!fs.existsSync(assetPath)) {
    console.error(`❌ Required asset not found: ${asset}`);
    hasIssues = true;
  } else {
    console.log(`✅ ${asset}`);
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasIssues) {
  console.error('❌ Configuration has issues that need to be fixed');
  process.exit(1);
} else {
  console.log('✅ All configuration checks passed!');
  console.log('✅ Expo configuration is valid');
  console.log('\nNext steps:');
  console.log('  - Run: npx expo start --clear');
  console.log('  - Or: npx expo prebuild --platform android --clean');
  process.exit(0);
}
