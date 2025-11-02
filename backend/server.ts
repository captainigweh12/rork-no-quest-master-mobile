import { serve } from 'hono/serve';
import app from './hono';

const port = Number(process.env.PORT ?? 8081);
console.log(`[Hono] listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
