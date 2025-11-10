// babel.config.js
console.log('>> Using babel config at:', __filename);

const makeConfig = function (api) {
  api && api.cache && api.cache(true);

  const isTest =
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.NODE_ENV === 'test';

  const plugins = [
    // Must come before expo-router
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          // Project root alias
          '@': './',

          // Rork stubs (no file extensions for maximum compatibility)
          '@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk',
          '@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],

    // Expo Router (keep before Reanimated)
    'expo-router/babel',
  ];

  if (!isTest) {
    // Reanimated MUST be last
    plugins.push('react-native-reanimated/plugin');
  }

  return {
    presets: ['babel-preset-expo', '@babel/preset-typescript'],
    plugins,
  };
};

// ✅ Support both CJS require() and ESM import()
module.exports = makeConfig;
module.exports.default = makeConfig;
