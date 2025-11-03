import { serve } from '@hono/node-server';
import { networkInterfaces } from 'os';
import { resolve } from 'path';
import { config } from 'dotenv';

// 🧩 Load environment variables BEFORE importing the app
// Load both the root .env and backend/.env (backend/.env takes priority)
config({ path: resolve(process.cwd(), '.env'), override: true });
config({ path: resolve(process.cwd(), 'backend/.env'), override: true });

// ✅ Import Hono app AFTER envs are loaded
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

      console.log(`\n🚀 [Hono] Listening on: http://localhost:${port}`);
      if (lan) console.log(`🌐 LAN address: http://${lan}:${port}`);

      // 🔍 Print environment presence for quick verification
      console.log('\n[ENV CHECK]');
      console.log('AGORA_APP_ID present:', !!process.env.AGORA_APP_ID);
      console.log('AGORA_APP_CERTIFICATE present:', !!process.env.AGORA_APP_CERTIFICATE);
      console.log('AGORA_CUSTOMER_ID present:', !!process.env.AGORA_CUSTOMER_ID);
      console.log('AGORA_CUSTOMER_SECRET present:', !!process.env.AGORA_CUSTOMER_SECRET);
      console.log('MINT_RTC_TOKEN_SECRET present:', !!process.env.MINT_RTC_TOKEN_SECRET);
      console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
      console.log('SUPABASE_WEBHOOK_SECRET present:', !!process.env.SUPABASE_WEBHOOK_SECRET);

      return server;
    } catch (err: any) {
      if (
        err?.message?.includes('address already in use') ||
        err?.code === 'EADDRINUSE'
      ) {
        console.error(`[Hono] Port ${port} in use, trying ${port + 1}...`);
        continue;
      }
      console.error('[Hono] Failed to start server:', err?.message ?? err);
      process.exit(1);
    }
  }

  console.error(`[Hono] Could not find a free port starting from ${startPort} after ${maxAttempts} attempts.`);
  process.exit(1);
}

startServer();
