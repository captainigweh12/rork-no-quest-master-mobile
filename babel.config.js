// babel.config.js
module.exports = function (api) {
  api.cache(true);

  // Skip Reanimated in tests to avoid global mutations
  const isTest =
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.NODE_ENV === 'test';

  const plugins = [
    // 1) Path aliases — ensures Metro can resolve the same paths as tsconfig
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './',
          '@rork-ai/toolkit-sdk': './stubs/rork-toolkit-sdk.ts',
          '@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk.ts',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],

    // 2) expo-router (keep before Reanimated)
    'expo-router/babel',
  ];

  // 3) Reanimated MUST be last and is skipped in tests
  if (!isTest) {
    plugins.push('react-native-reanimated/plugin');
  }

  return {
    // `babel-preset-expo` already handles TypeScript, but leaving the TS preset is harmless.
    presets: ['babel-preset-expo', '@babel/preset-typescript'],
    plugins,
  };
};
