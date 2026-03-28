// Stub implementation for @rork-ai/toolkit-dev-sdk to satisfy lint and runtime during development.
// Replace with real SDK when available.

export function createDevTool(..._args: any[]): any {
  return { name: 'stubDevTool', run: () => Promise.resolve('ok') };
}

export function useDevAgent(..._args: any[]): any {
  return { status: 'inactive', invoke: () => Promise.resolve('noop') };
}

export async function testDevFunction(..._args: any[]): Promise<any> {
  return { stub: true, dev: true };
}
