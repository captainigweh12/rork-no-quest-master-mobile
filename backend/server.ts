// backend/server.ts  — load env first, then import app

import { serve } from '@hono/node-server';
import { networkInterfaces } from 'os';
import { resolve } from 'path';
import { config } from 'dotenv';

// 1) Load env from project root and backend/.env (backend overrides root)
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), 'backend/.env') });

// 2) Import Hono app AFTER env is loaded
const { default: app } = await import('./hono');

function getLanIP(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const iface = nets[name];
    if (!iface) continue;
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

async function startServer() {
  const startPort = Number(process.env.PORT ?? 8081);
  const hostname = '0.0.0.0' as const;
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i += 1) {
    const port = startPort + i;
    try {
      const server = serve({ fetch: app.fetch, port, hostname });
      const lan = getLanIP();
      console.log(`[Hono] listening on http://localhost:${port}`);
      if (lan) console.log(`[Hono] LAN address     http://${lan}:${port}`);
      // Helpful preview so you can see env presence immediately
      console.log('[ENV] AGORA_APP_ID present:', !!process.env.AGORA_APP_ID);
      console.log('[ENV] AGORA_APP_CERTIFICATE present:', !!process.env.AGORA_APP_CERTIFICATE);
      console.log('[ENV] AGORA_CUSTOMER_ID present:', !!process.env.AGORA_CUSTOMER_ID);
      console.log('[ENV] AGORA_CUSTOMER_SECRET present:', !!process.env.AGORA_CUSTOMER_SECRET);
      console.log('[ENV] MINT_RTC_TOKEN_SECRET present:', !!process.env.MINT_RTC_TOKEN_SECRET);
      return server;
    } catch (e: any) {
      if (
        e?.message?.includes('address already in use') ||
        e?.message?.includes('Failed to start server') ||
        e?.code === 'EADDRINUSE'
      ) {
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
