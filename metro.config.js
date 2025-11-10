const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs', 'mjs');

config.resolver.extraNodeModules = {
'@rork-ai/toolkit-sdk': path.resolve(__dirname, 'stubs/rork-toolkit-sdk.ts'),
'@rork-ai/toolkit-dev-sdk': path.resolve(__dirname, 'stubs/rork-ai-toolkit-dev-sdk.ts'),
};

module.exports = config;