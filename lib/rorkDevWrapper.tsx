import type { PropsWithChildren, ComponentType } from 'react';

let Impl: ComponentType<PropsWithChildren> | null = null;

// Only attempt to load in non-production environments
if (__DEV__) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const m = require('@rork-ai/toolkit-dev-sdk');
    Impl = (m?.RorkDevWrapper as ComponentType<PropsWithChildren>) ?? null;
  } catch {
    // Silently fail - dev wrapper is optional
    console.log('[RorkDevWrapper] Dev SDK not available (optional)');
  }
}

export function RorkDevMaybe({ children }: PropsWithChildren) {
  return Impl ? <Impl>{children}</Impl> : <>{children}</>;
}
