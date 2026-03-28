// @ts-nocheck
// Jest setup for React Native + Expo

// Optional: mock timers
jest.useFakeTimers();

// Polyfill TextEncoder / TextDecoder for node environment
if (typeof (global as any).TextEncoder === 'undefined') {
  try {
    (global as any).TextEncoder = class TextEncoder {
    encoding = 'utf-8';
    encode(input: string): Uint8Array {
      return new Uint8Array(Buffer.from(input));
    }
    encodeInto(source: string, destination: Uint8Array) {
      const encoded = this.encode(source);
      destination.set(encoded);
      return { read: source.length, written: encoded.length };
    }
    } as any;
  } catch (e) {
    // ignore if environment prevents assignment
  }
}

if (typeof (global as any).TextDecoder === 'undefined') {
  try {
    (global as any).TextDecoder = class TextDecoder {
    encoding = 'utf-8';
    fatal = false;
    ignoreBOM = false;
    constructor() {}
    decode(input?: Uint8Array): string {
      return input ? Buffer.from(input).toString() : '';
    }
    } as any;
  } catch (e) {
    // ignore if environment prevents assignment
  }
}

// Minimal Response / Headers polyfill for tests (so tests can construct Response objects)
if (typeof (global as any).Response === 'undefined') {
  class MockHeaders {
    private map: Record<string,string>;
    constructor(init: Record<string,string> = {}) { this.map = {};
      for (const k of Object.keys(init)) this.map[k.toLowerCase()] = init[k];
    }
    get(key: string) { return this.map[key.toLowerCase()] ?? null; }
  }

  class MockResponse {
    private _body: any;
    status: number;
    headers: MockHeaders;
    constructor(body: any = null, init: any = {}) {
      this._body = body;
      this.status = init.status ?? 200;
      this.headers = new MockHeaders(init.headers ?? {});
    }
    async text() {
      if (typeof this._body === 'string') return this._body;
      if (Buffer.isBuffer(this._body)) return this._body.toString();
      if (this._body instanceof ArrayBuffer || ArrayBuffer.isView(this._body)) return Buffer.from(new Uint8Array(this._body as any)).toString();
      return String(this._body ?? '');
    }
    async arrayBuffer() {
      if (Buffer.isBuffer(this._body)) return this._body.buffer.slice(this._body.byteOffset, this._body.byteOffset + this._body.byteLength);
      if (this._body instanceof Uint8Array) return this._body.buffer;
      return Buffer.from(String(this._body ?? '')).buffer;
    }
    clone() { return new MockResponse(this._body, { status: this.status, headers: this.headers }); }
  }

  try {
    (global as any).Headers = MockHeaders;
    (global as any).Response = MockResponse;
  } catch (e) {
    // ignore if environment prevents assignment
  }
}

// Basic fetch mock
if (typeof (global as any).fetch === 'undefined') {
  try {
    (global as any).fetch = (...args: any[]) => Promise.resolve(new (global as any).Response(''));
  } catch (e) {
    // fallback no-op
    (global as any).fetch = (..._args: any[]) => Promise.resolve({ status: 200, text: async () => '' } as any);
  }
}

// Silence warnings
jest.spyOn(global.console, 'error').mockImplementation(() => {});
jest.spyOn(global.console, 'warn').mockImplementation(() => {});
