module.exports = function(api) {
  api.cache(true);
  const isTest = process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';

  const plugins = [
    [
      "module-resolver",
      {
        root: ["."],
        alias: {
          "@": "./",
        },
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    ],
  ];

  // Avoid react-native-reanimated plugin in test environment (it mutates globals)
  if (!isTest) {
    plugins.push('react-native-reanimated/plugin');
  }

  return {
    presets: ["babel-preset-expo", "@babel/preset-typescript"],
    plugins,
  };
};
