import React from "react";
// CRITICAL: This polyfill MUST run before expo-router loads
// It patches React 18.x to add the React.use() API that expo-router expects

/* eslint-disable */

// Get the React module via require (works in both CommonJS and ESM)
const ReactModule = require('react');

// Polyfill implementation
function polyfillUse(target) {
  if (typeof target.use === 'function') {
    return; // Already exists
  }

  target.use = function use(usable) {
    // Handle Context consumption
    if (usable && typeof usable === 'object' && 'Provider' in usable) {
      return target.useContext(usable);
    }

    // Handle promises (not fully supported in React 18, but we can throw a clear error)
    if (usable && typeof usable.then === 'function') {
      throw new Error('React.use() with promises requires React 19+');
    }

    // Handle functions
    if (typeof usable === 'function') {
      return usable();
    }

    // Return as-is for other types
    return usable;
  };
}

// Patch all possible export locations
polyfillUse(ReactModule);
if (ReactModule.default) {
  polyfillUse(ReactModule.default);
}

// Also patch via module.exports for CommonJS
if (typeof module !== 'undefined' && module.exports === ReactModule) {
  polyfillUse(module.exports);
  if (module.exports.default) {
    polyfillUse(module.exports.default);
  }
}

console.log('[Polyfill] React.use() polyfill applied. React.use exists:', typeof ReactModule.use === 'function');
