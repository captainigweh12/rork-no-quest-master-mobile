// Stub implementation for @rork-ai/toolkit-sdk to satisfy lint and runtime during development.
// Replace with real SDK when available.
export async function generateObject(..._args: any[]): Promise<any> {
  return { stub: true };
}
export async function generateText(..._args: any[]): Promise<string> {
  return 'stub-text';
}
export function useRorkAgent(..._args: any[]): any {
  return { status: 'inactive', invoke: () => Promise.resolve('noop') };
}
export function createRorkTool(..._args: any[]): any {
  return { name: 'stubTool', run: () => Promise.resolve('ok') };
}
