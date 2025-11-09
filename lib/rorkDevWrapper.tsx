import type { PropsWithChildren, ComponentType } from 'react';

let Impl: ComponentType<PropsWithChildren> | null = null;
try {
  // Root entry; adjust to '/expo' if your package exposes that variant instead.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require('@rork-ai/toolkit-dev-sdk');
  Impl = (m?.RorkDevWrapper as ComponentType<PropsWithChildren>) ?? null;
} catch {
  Impl = null;
}

export function RorkDevMaybe({ children }: PropsWithChildren) {
  return Impl ? <Impl>{children}</Impl> : <>{children}</>;
}
