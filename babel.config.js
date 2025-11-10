module.exports = function (api) {
  api.cache(true);

  const isTest =
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.NODE_ENV === 'test';

  const plugins = [
    // Your path aliases - must come before expo-router
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './',
          '@rork/toolkit-sdk': './stubs/rork-toolkit-sdk',
          '@rork-ai/toolkit-dev-sdk': './stubs/rork-ai-toolkit-dev-sdk',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],

    // Required for expo-router
    'expo-router/babel',
  ];

  // Reanimated MUST be last and is skipped in tests to avoid global mutations
  if (!isTest) {
    plugins.push('react-native-reanimated/plugin');
  }

  return {
    presets: ['babel-preset-expo', '@babel/preset-typescript'],
    plugins,
  };
};
