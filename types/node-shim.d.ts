declare module 'crypto' {
  const anyCrypto: any;
  export default anyCrypto;
}

declare module 'zlib' {
  export const deflateRawSync: any;
  const anyZlib: any;
  export default anyZlib;
}
