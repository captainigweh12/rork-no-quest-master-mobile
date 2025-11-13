// IMPORTANT: This must run BEFORE expo-router loads
console.log('[Polyfill] Applying React.use() polyfill for React 18.x...');

import * as ReactNamespace from 'react';
import React from "react";

type ReactWithUse = {
  use?: <T>(usable: unknown) => T;
  useContext: <T>(ctx: ReactNamespace.Context<T>) => T;
};

type ReactModule = ReactWithUse & {
  default?: ReactWithUse;
};

type Thenable<T> = {
  then: (onfulfilled?: ((value: T) => void) | null, onrejected?: ((reason: unknown) => void) | null) => unknown;
};

const reactModule = ReactNamespace as ReactModule;
const reactDefault = (reactModule.default ?? reactModule) as ReactWithUse;

const ensureUseImplementation = (target: ReactWithUse) => {
  if (typeof target.use === 'function') {
    return;
  }

  target.use = <T>(usable: unknown): T => {
    if (usable && typeof usable === 'object' && 'Provider' in (usable as Record<string, unknown>)) {
      return target.useContext(usable as ReactNamespace.Context<T>);
    }

    if (usable && typeof (usable as Thenable<T>).then === 'function') {
      throw new Error('React.use promise consumption requires React 19.');
    }

    if (typeof usable === 'function') {
      return (usable as () => T)();
    }

    return usable as T;
  };
};

ensureUseImplementation(reactModule);
ensureUseImplementation(reactDefault);
if (reactModule.default) {
  ensureUseImplementation(reactModule.default);
}

console.log('[Polyfill] React.use() polyfill applied successfully. React.use exists:', typeof React.use === 'function');
console.log('[Polyfill] ReactNamespace.use exists:', typeof ReactNamespace.use === 'function');
