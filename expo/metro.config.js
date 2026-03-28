const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs', 'mjs');

// Platform-specific extensions for proper native/web resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

config.resolver.extraNodeModules = {
  '@rork-ai/toolkit-sdk': path.resolve(__dirname, 'stubs/rork-toolkit-sdk'),
  '@rork-ai/toolkit-dev-sdk': path.resolve(__dirname, 'stubs/rork-ai-toolkit-dev-sdk'),
};

module.exports = config;