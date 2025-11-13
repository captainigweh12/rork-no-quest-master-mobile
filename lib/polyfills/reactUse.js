import React from "react";
// IMPORTANT: This must run BEFORE expo-router loads
console.log('[Polyfill] Applying React.use() polyfill for React 18.x...');

const React = require('react');

const ensureUseImplementation = (target) => {
  if (typeof target.use === 'function') {
    return;
  }

  target.use = (usable) => {
    if (usable && typeof usable === 'object' && 'Provider' in usable) {
      return target.useContext(usable);
    }

    if (usable && typeof usable.then === 'function') {
      throw new Error('React.use promise consumption requires React 19.');
    }

    if (typeof usable === 'function') {
      return usable();
    }

    return usable;
  };
};

// Patch the main React module
ensureUseImplementation(React);

// Patch React.default if it exists
if (React.default) {
  ensureUseImplementation(React.default);
}

// Also patch the require cache
try {
  const reactCached = require.cache[require.resolve('react')];
  if (reactCached && reactCached.exports) {
    ensureUseImplementation(reactCached.exports);
    if (reactCached.exports.default) {
      ensureUseImplementation(reactCached.exports.default);
    }
  }
} catch (e) {
  // Ignore
}

console.log('[Polyfill] React.use() polyfill applied successfully. React.use exists:', typeof React.use === 'function');

module.exports = React;
