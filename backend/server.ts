import { serve } from '@hono/node-server';
import app from './hono';

async function startServer() {
  const startPort = Number(process.env.PORT ?? 8081);
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i += 1) {
    const port = startPort + i;
    try {
      const server = serve({ fetch: app.fetch, port });
      console.log(`[Hono] listening on http://localhost:${port}`);
      return server;
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      if (e?.message?.includes('address already in use') || e?.message?.includes('Failed to start server') || e?.code === 'EADDRINUSE') {
        console.error(`[Hono] Port ${port} in use, trying ${port + 1}...`);
        continue;
      }
      console.error('[Hono] Failed to start server:', e?.message ?? e);
      process.exit(1);
    }
  }
  console.error(`[Hono] Could not find a free port starting from ${startPort} after ${maxAttempts} attempts.`);
  process.exit(1);
}

startServer();
