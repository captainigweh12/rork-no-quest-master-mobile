import React, { Context } from 'react';

type ReactWithUse = typeof React & {
  use?: <T>(usable: unknown) => T;
  useContext: <T>(ctx: Context<T>) => T;
};

type Thenable<T> = {
  then: (onfulfilled?: ((value: T) => void) | null, onrejected?: ((reason: unknown) => void) | null) => unknown;
};

const reactWithUse = React as ReactWithUse;

if (typeof reactWithUse.use !== 'function') {
  reactWithUse.use = <T>(usable: unknown): T => {
    if (usable && typeof usable === 'object' && 'Provider' in (usable as Record<string, unknown>)) {
      return reactWithUse.useContext(usable as Context<T>);
    }

    if (usable && typeof (usable as Thenable<T>).then === 'function') {
      throw new Error('React.use promise consumption requires React 19.');
    }

    if (typeof usable === 'function') {
      return (usable as () => T)();
    }

    return usable as T;
  };
}
