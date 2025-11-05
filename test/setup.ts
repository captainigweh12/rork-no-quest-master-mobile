import { beforeAll, vi } from 'vitest';

declare const global: NodeJS.Global;

// Mock React Native modules at module level (required for vi.mock to work)
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

// Basic React Native environment setup
beforeAll(() => {
  (global as any).React = {
    createElement: function createElement(type: any, props: any, ...children: any[]) {
      return { type, props, children };
    }
  };

  // Mock React Native components and APIs
  (global as any).ReactNative = {
    Platform: { 
      select: (obj: Record<string, any>) => obj.default ?? obj.native ?? obj.ios ?? obj.android
    },
    StyleSheet: {
      create: (styles: Record<string, any>) => styles,
    },
  };
});

// Text encoder/decoder polyfills if needed
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = class TextEncoder {
    encoding = 'utf-8';
    encode(input: string): Uint8Array {
      return new Uint8Array(Buffer.from(input));
    }
    encodeInto(source: string, destination: Uint8Array): { read: number; written: number } {
      const encoded = this.encode(source);
      destination.set(encoded);
      return { read: source.length, written: encoded.length };
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = class TextDecoder {
    encoding = 'utf-8';
    fatal = false;
    ignoreBOM = false;
    
    constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }) {
      this.fatal = options?.fatal ?? false;
      this.ignoreBOM = options?.ignoreBOM ?? false;
    }

    decode(input?: Uint8Array | undefined): string {
      return input ? Buffer.from(input).toString() : "";
    }
  };
}
