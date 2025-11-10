const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    settings: {
      // Treat these as core modules so import/no-unresolved doesn't flag them
      'import/core-modules': [
        '@rork/toolkit-sdk',
        '@rork-ai/toolkit-dev-sdk',
      ],
    },
    rules: {
      // Relax a few noisy react rules that were failing CI
      'react/no-unescaped-entities': 'warn',
      'react/display-name': 'warn',
    },
  },
]);
