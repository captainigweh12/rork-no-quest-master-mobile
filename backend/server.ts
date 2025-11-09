import { serve } from '@hono/node-server';
import { networkInterfaces } from 'os';
import { resolve } from 'path';
import { config } from 'dotenv';

// 🧩 Load environment variables BEFORE importing the app
// Load both the root .env and backend/.env (backend/.env takes priority)
config({ path: resolve(process.cwd(), '.env'), override: true });
config({ path: resolve(process.cwd(), 'backend/.env'), override: true });

// ✅ Import Hono app AFTER envs are loaded
import app from './hono.js';
import { ProcessManager } from './process-manager.js';

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
  const hostname = '0.0.0.0' as const;

  try {
    // 🛡️ Initialize process manager (handles stale processes, graceful shutdown)
    await ProcessManager.checkForStaleProcess();

    // 🔍 Find a free port (with multi-port fallback)
    const requestedPort = Number(process.env.PORT ?? 8081);
    const port = await ProcessManager.reservePort(requestedPort, 8090);
    
    if (port !== requestedPort) {
      console.log(`⚠️  Requested port ${requestedPort} busy; using ${port} instead`);
    }

    await ProcessManager.initialize({ portHint: port });
    await ProcessManager.ensurePortFree(port);
    
    const server = serve({ fetch: app.fetch, port, hostname });
    
    // Attach server for graceful shutdown with socket draining
    ProcessManager.withHttpServer(server as any);
    
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
    console.log('VIDEOSDK_API_KEY present:', !!process.env.VIDEOSDK_API_KEY);
    console.log('VIDEOSDK_SECRET_KEY present:', !!process.env.VIDEOSDK_SECRET_KEY);
    console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
    console.log('SUPABASE_WEBHOOK_SECRET present:', !!process.env.SUPABASE_WEBHOOK_SECRET);

    return server;
  } catch (err: any) {
    console.error('[Hono] Failed to start server:', err?.message ?? err);
    process.exit(1);
  }
}

startServer();
