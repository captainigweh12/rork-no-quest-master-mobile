module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>'],
  // Only run files named *.test.* or *.spec.* to avoid picking up .d.ts or helper TS files
  testMatch: ['**/__tests__/**/*.(test|spec).?(ts|tsx|js)', '**/test/**/*.(test|spec).?(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-async-storage)/)'
  ],
  // Setup file disabled temporarily for debugging environment errors
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testEnvironment: 'jsdom'
};